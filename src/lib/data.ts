

import { db } from "./firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  limit,
  writeBatch,
  Timestamp,
  getDoc,
  collectionGroup,
  setDoc,
} from "firebase/firestore";
import type { Transaction, AuditLog, AnalyticsData, Goal, Budget, SupportTicket, User, TeamMemberPermission } from "./types";
import { createHash } from 'crypto';
import { subDays, startOfMonth, endOfMonth, format, addMonths } from 'date-fns';
import type { DateRange } from "react-day-picker";
import { FirestorePermissionError } from './errors';
import { errorEmitter } from './error-emitter';

// ===================================================================================
// Transactions
// ===================================================================================
export async function getTransactions(userId: string, filter?: 'personal' | 'business'): Promise<Transaction[]> {
    if (!userId) {
        return [];
    }
    
    const transactionsCol = collection(db, `users/${userId}/transactions`);
    let q = query(transactionsCol);

    try {
        const snapshot = await getDocs(q);
        
        let transactions = snapshot.docs.map(doc => {
            const data = doc.data();
            
            // Converter data corretamente
            let dateString: string;
            if (data.date && typeof data.date === 'object' && 'seconds' in data.date) {
                // Firestore Timestamp - converter para Timestamp primeiro
                const timestamp = new Timestamp(data.date.seconds, data.date.nanoseconds);
                dateString = timestamp.toDate().toISOString();
            } else if (data.date && typeof data.date === 'string') {
                // Já é string ISO
                dateString = data.date;
            } else {
                // Fallback para data atual
                dateString = new Date().toISOString();
            }
            
            return {
                ...data,
                id: doc.id,
                date: dateString
            } as Transaction;
        });

        if (filter) {
            transactions = transactions.filter(t => {
                if (filter === 'business') {
                    return ['business', 'mixed', 'loan_to_business', 'loan_to_personal'].includes(t.category);
                }
                if (filter === 'personal') {
                    return ['personal', 'mixed', 'loan_to_business', 'loan_to_personal'].includes(t.category);
                }
                return true;
            });
        }

        return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (serverError: any) {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: transactionsCol.path,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        return [];
    }
}


export async function addTransaction(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
  const { userId, ...transactionData } = transaction;
  if (!userId) {
    throw new Error("User ID is missing in transaction data for addTransaction.");
  }
  
  const collectionRef = collection(db, `users/${userId}/transactions`);
  const transactionDate = new Date(transaction.date);
  const dateString = transactionDate.toISOString().split('T')[0]; // YYYY-MM-DD
  
  const dataToSave = {
      ...transactionData,
      userId,
      date: Timestamp.fromDate(transactionDate),
      dateString: dateString, // Campo adicional para queries otimizadas
  };

  const docRef = await addDoc(collectionRef, dataToSave).catch(serverError => {
      
      if (serverError.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
              path: collectionRef.path,
              operation: 'create',
              requestResourceData: dataToSave
          });
          errorEmitter.emit('permission-error', permissionError);
      }
      throw serverError;
  });

  return { ...transaction, id: docRef.id };
}


export async function updateTransaction(userId: string, id: string, data: Partial<Omit<Transaction, 'id' | 'userId'>>, applyToFuture: boolean = false): Promise<Transaction> {
    const docRef = doc(db, `users/${userId}/transactions`, id);
    const transactionSnap = await getDoc(docRef);
    if (!transactionSnap.exists()) {
        throw new Error("Transaction not found");
    }
    const originalTransaction = transactionSnap.data() as Transaction;
    
    const updatedData = { ...data };
    if(data.date && typeof data.date === 'string') {
        updatedData.date = Timestamp.fromDate(new Date(data.date)) as any;
    }

    await updateDoc(docRef, updatedData).catch(serverError => {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'update',
                requestResourceData: updatedData
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw serverError;
    });

    // If it's an installment and applyToFuture is true
    if (applyToFuture && originalTransaction.installmentId && originalTransaction.currentInstallment) {
        const batch = writeBatch(db);
        const q = query(
            collection(db, `users/${userId}/transactions`),
            where("installmentId", "==", originalTransaction.installmentId),
            where("currentInstallment", ">", originalTransaction.currentInstallment)
        );
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(docSnap => {
            const installmentData = docSnap.data() as Transaction;
            const updatePayload: Partial<Transaction> = {
                description: data.description ? data.description.replace(/\(\d+\/\d+\)/, `(${installmentData.currentInstallment}/${installmentData.installments})`) : installmentData.description,
                category: data.category || installmentData.category,
                paymentMethod: data.paymentMethod || installmentData.paymentMethod,
                paymentSource: data.paymentSource || installmentData.paymentSource,
                notes: data.notes || installmentData.notes,
            };
            batch.update(doc(db, `users/${userId}/transactions`, docSnap.id), updatePayload);
        });
        await batch.commit();
    }
    
    return { ...originalTransaction, ...data, id };
}

export async function deleteTransaction(userId: string, id: string): Promise<void> {
    const docRef = doc(db, `users/${userId}/transactions`, id);
    await deleteDoc(docRef).catch(serverError => {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw serverError;
    });
}


// ===================================================================================
// Audit Log
// ===================================================================================

function createAuditHash(logData: Omit<AuditLog, 'hash' | 'id'>): string {
  const logString = `${logData.date}${logData.userId}${logData.userName}${logData.action}${logData.entity}${logData.entityId}${logData.details}${logData.previousHash}`;
  return createHash('sha256').update(logString).digest('hex');
}

export async function addAuditLog(log: Omit<AuditLog, 'id' | 'hash' | 'previousHash'>): Promise<AuditLog> {
    const userId = log.userId;
    if (!userId) throw new Error("User ID is required to add an audit log.");
    const auditCol = collection(db, `users/${userId}/auditLogs`);
    const lastLogQuery = query(auditCol, orderBy('date', 'desc'), limit(1));
    
    const lastLogSnapshot = await getDocs(lastLogQuery).catch(serverError => {
        if (serverError.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: auditCol.path, operation: 'list' }));
        }
        throw serverError;
    });
    
    const previousHash = lastLogSnapshot.empty ? null : lastLogSnapshot.docs[0].data().hash;

    const logDataWithPrevHash = { ...log, previousHash };
    const hash = createAuditHash(logDataWithPrevHash);

    const newLogData = {
        ...logDataWithPrevHash,
        hash,
        date: Timestamp.fromDate(new Date(log.date))
    };

    const docRef = await addDoc(auditCol, newLogData).catch(serverError => {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: auditCol.path,
                operation: 'create',
                requestResourceData: newLogData,
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw serverError;
    });
    
    return { ...newLogData, id: docRef.id, date: log.date } as AuditLog;
}

export async function getAuditLogs(userId: string): Promise<AuditLog[]> {
    const auditCol = collection(db, `users/${userId}/auditLogs`);
    const q = query(auditCol, orderBy('date', 'desc'));
    const snapshot = await getDocs(q).catch(serverError => {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: auditCol.path,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw serverError;
    });
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            id: doc.id,
            date: (data.date as Timestamp).toDate().toISOString()
        } as AuditLog;
    });
}

// ===================================================================================
// Goals and Budgets
// ===================================================================================

export async function getGoalsAndBudgets(userId: string): Promise<{ goals: Goal[], budgets: Budget[] }> {
    const goalsCol = collection(db, `users/${userId}/goals`);
    const budgetsCol = collection(db, `users/${userId}/budgets`);
    const transactions = await getTransactions(userId);

    const [goalsSnapshot, budgetsSnapshot] = await Promise.all([
        getDocs(goalsCol).catch(serverError => {
            if (serverError.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: goalsCol.path, operation: 'list' }));
            }
            throw serverError;
        }),
        getDocs(budgetsCol).catch(serverError => {
            if (serverError.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: budgetsCol.path, operation: 'list' }));
            }
            throw serverError;
        }),
    ]);

    const goals = goalsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Goal));
    const budgets = budgetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Budget));
    
    // Server-side calculation of progress
    const profitGoal = goals.find(g => g.type === 'profit');
    if (profitGoal) {
        const goalStartDate = new Date(profitGoal.deadline);
        goalStartDate.setMonth(goalStartDate.getMonth() - 3); // Assuming 3 month goal
        const profitTransactions = transactions.filter(t => new Date(t.date) >= goalStartDate);
        const businessIncome = profitTransactions.filter(t => t.category === 'business' && t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const businessExpenses = profitTransactions.filter(t => t.category === 'business' && t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const mixedIncomes = profitTransactions.filter(t => t.category === 'mixed' && t.type === 'income').reduce((sum, t) => sum + (t.amount / 2), 0);
        const mixedExpenses = profitTransactions.filter(t => t.category === 'mixed' && t.type === 'expense').reduce((sum, t) => sum + (t.amount / 2), 0);
        profitGoal.currentAmount = (businessIncome + mixedIncomes) - (businessExpenses + mixedExpenses);
    }
    
    const currentMonthTransactions = transactions.filter(t => new Date(t.date).getMonth() === new Date().getMonth() && new Date(t.date).getFullYear() === new Date().getFullYear());
    budgets.forEach(budget => {
        // Simplified calculation, a real app would need a more robust mapping
        let spent = 0;
        if (budget.category === 'business_marketing') spent = currentMonthTransactions.filter(t => t.description.toLowerCase().includes('ads')).reduce((sum, t) => sum + t.amount, 0);
        if (budget.category === 'business_supplies') spent = currentMonthTransactions.filter(t => t.description.toLowerCase().includes('material')).reduce((sum, t) => sum + t.amount, 0);
        if (budget.category === 'personal_food') spent = currentMonthTransactions.filter(t => t.description.toLowerCase().includes('supermercado') || t.description.toLowerCase().includes('ifood')).reduce((sum, t) => sum + t.amount, 0);
        budget.spentAmount = spent;
    });

    return { goals, budgets };
}

export async function addOrUpdateGoal(goal: Goal): Promise<Goal> {
    const { id, userId, ...goalData } = goal;
    if (!userId) throw new Error("User ID is required to save a goal.");
    const goalsCol = collection(db, `users/${userId}/goals`);

    if (id) {
        const docRef = doc(goalsCol, id);
        await updateDoc(docRef, goalData).catch(serverError => {
            if (serverError.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: docRef.path,
                    operation: 'update',
                    requestResourceData: goalData,
                }));
            }
            throw serverError;
        });
        return goal;
    } else {
        const docRef = await addDoc(goalsCol, goalData).catch(serverError => {
            if (serverError.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: goalsCol.path,
                    operation: 'create',
                    requestResourceData: goalData,
                }));
            }
            throw serverError;
        });
        return { ...goal, id: docRef.id };
    }
}

export async function addOrUpdateBudget(budget: Budget): Promise<Budget> {
    const { id, userId, ...budgetData } = budget;
    if (!userId) throw new Error("User ID is required to save a budget.");
    const budgetsCol = collection(db, `users/${userId}/budgets`);

    if (id) {
        const docRef = doc(budgetsCol, id);
        await updateDoc(docRef, budgetData).catch(serverError => {
            if (serverError.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: docRef.path,
                    operation: 'update',
                    requestResourceData: budgetData,
                }));
            }
            throw serverError;
        });
        return budget;
    } else {
        const docRef = await addDoc(budgetsCol, budgetData).catch(serverError => {
            if (serverError.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: budgetsCol.path,
                    operation: 'create',
                    requestResourceData: budgetData,
                }));
            }
            throw serverError;
        });
        return { ...budget, id: docRef.id };
    }
}

export async function deleteGoal(userId: string, id: string): Promise<Goal> {
    const docRef = doc(db, `users/${userId}/goals`, id);
    const goalSnap = await getDoc(docRef);
    if (!goalSnap.exists()) throw new Error("Goal not found");
    const goalData = { id, userId, ...goalSnap.data() } as Goal;
    await deleteDoc(docRef).catch(serverError => {
        if (serverError.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: docRef.path,
                operation: 'delete',
            }));
        }
        throw serverError;
    });
    return goalData;
}

export async function deleteBudget(userId: string, id: string): Promise<Budget> {
    const docRef = doc(db, `users/${userId}/budgets`, id);
    const budgetSnap = await getDoc(docRef);
    if (!budgetSnap.exists()) throw new Error("Budget not found");
    const budgetData = { id, userId, ...budgetSnap.data() } as Budget;
    await deleteDoc(docRef).catch(serverError => {
        if (serverError.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: docRef.path,
                operation: 'delete',
            }));
        }
        throw serverError;
    });
    return budgetData;
}


// ===================================================================================
// Support Tickets (Migrated to Firestore)
// ===================================================================================
export async function getUserSupportTickets(userId: string): Promise<SupportTicket[]> {
    const ticketsCol = collection(db, `users/${userId}/tickets`);
    const q = query(ticketsCol, orderBy("createdAt", "desc"));

    const snapshot = await getDocs(q).catch(serverError => {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: `users/${userId}/tickets`,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw serverError;
    });

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            id: doc.id,
            createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
            updatedAt: (data.updatedAt as Timestamp).toDate().toISOString(),
        } as SupportTicket;
    });
}

export async function addSupportTicket(ticketData: Omit<SupportTicket, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'replies'>): Promise<SupportTicket> {
    const userId = ticketData.userId;
    if (!userId) throw new Error("User ID is required to create a ticket.");

    const now = new Date();
    const newTicket: Omit<SupportTicket, 'id'> = {
        ...ticketData,
        status: 'Aberto',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
    };
    
    const ticketsCollection = collection(db, `users/${userId}/tickets`);
    const dataToSave = {
        ...newTicket,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
    };

    const docRef = await addDoc(ticketsCollection, dataToSave).catch(serverError => {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: ticketsCollection.path,
                operation: 'create',
                requestResourceData: dataToSave
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw serverError;
    });

    return { ...newTicket, id: docRef.id };
}

// ===================================================================================
// User Management
// ===================================================================================
export async function updateUserInDb(user: User, auditInfo: {userId: string, userName: string}): Promise<User> {
    const userDocRef = doc(db, 'users', user.id);
    await setDoc(userDocRef, user, { merge: true }).catch(serverError => {
        if (serverError.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'update',
                requestResourceData: user,
            }));
        }
        throw serverError;
    });

    let action: 'create' | 'update' = auditInfo.userId === user.id ? 'update' : 'create';
    
    // Avoid logging audit for self-update of non-critical fields
    if (action === 'update' && auditInfo.userId === user.id) {
      // you can add more logic here to check what changed if needed
    } else {
       await addAuditLog({
        ...auditInfo,
        action: action,
        entity: 'user',
        entityId: user.id,
        date: new Date().toISOString(),
        details: `Usuário "${user.name}" (${user.email}) foi ${action === 'create' ? 'criado' : 'atualizado'}.`,
      });
    }
    
    return user;
}


export async function fetchTeamMembersFromFirestore(actorId: string): Promise<User[]> {
    const actor = await getDoc(doc(db, 'users', actorId));
    if (!actor.exists()) return [];

    const actorData = actor.data() as User;
    if (!actorData.companyId) return [actorData];
    
    // Check if the actor has permission to view the team
    const hasPermission = actorData.role === 'Dono' || actorData.adminRole === 'Super Admin' || actorData.teamPermissions?.includes('view_dashboard');
    if (!hasPermission) {
        // If no permission, just return the user themselves
        return [actorData];
    }
    
    const usersCollection = collection(db, 'users');
    const q = query(usersCollection, where("companyId", "==", actorData.companyId));
    
    const snapshot = await getDocs(q).catch((serverError: any) => {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: 'users',
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw serverError;
    });

    if (snapshot.empty) {
        return [actorData];
    }
    return snapshot.docs.map(d => d.data() as User);
}


// ===================================================================================
// Summary and Analytics (These depend on getTransactions, so they work with Firestore now)
// ===================================================================================

export async function getNextMonthForecast(userId: string): Promise<{ total: number, transactions: Transaction[] }> {
    // Verificar se o usuário tem acesso à previsão
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
        throw new Error('Usuário não encontrado');
    }

    const userData = userDoc.data();
    const userPlan = userData?.plan || 'Gratuito';

    // Buscar configurações do plano
    const plansQuery = query(
        collection(db, 'plans'),
        where('name', '==', userPlan),
        where('status', '==', 'Ativo'),
        limit(1)
    );
    const plansSnapshot = await getDocs(plansQuery);

    if (!plansSnapshot.empty) {
        const planData = plansSnapshot.docs[0].data();
        const canUseForecast = planData.features?.forecast ?? false;

        if (!canUseForecast) {
            throw new Error('Esta funcionalidade não está disponível no seu plano. Faça upgrade para acessar previsões.');
        }
    } else if (userPlan === 'Gratuito') {
        throw new Error('Esta funcionalidade não está disponível no plano Gratuito. Faça upgrade para acessar previsões.');
    }

    const transactionsCol = collection(db, `users/${userId}/transactions`);
    const now = new Date();
    const startDate = startOfMonth(addMonths(now, 1));
    const endDate = endOfMonth(addMonths(now, 1));

    const q = query(transactionsCol, 
        where('type', '==', 'expense'),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
    );

    const snapshot = await getDocs(q).catch(serverError => {
        if (serverError.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: transactionsCol.path, operation: 'list' }));
        }
        throw serverError;
    });
    
    const futureTransactions = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
            ...data,
            id: doc.id,
            date: (data.date as Timestamp).toDate().toISOString()
        } as Transaction;
      })
      // Filtrar empréstimos - não são despesas reais
      .filter(t => !t.category.startsWith('loan'));

    const total = futureTransactions.reduce((acc, t) => acc + t.amount, 0);
    return { total, transactions: futureTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) };
}

export async function getAnalyticsData(userId: string, dateRange?: DateRange): Promise<AnalyticsData> {
    const now = new Date();
    const startDate = dateRange?.from || subDays(now, 90);
    const endDate = dateRange?.to || now;
    
    const transactionsCol = collection(db, `users/${userId}/transactions`);
    const q = query(transactionsCol, where('date', '>=', startDate), where('date', '<=', endDate));
    const snapshot = await getDocs(q).catch(serverError => {
        if (serverError.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: transactionsCol.path, operation: 'list' }));
        }
        throw serverError;
    });

    const filteredTransactions = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
          ...data,
          id: doc.id,
          date: (data.date as Timestamp).toDate().toISOString()
      } as Transaction;
    });

    let totalIncome = 0, totalExpenses = 0, businessIncome = 0, businessExpenses = 0, personalExpenses = 0;
    const categoryBreakdown: AnalyticsData['categoryBreakdown'] = {};
    const monthlyProfitTrend: AnalyticsData['monthlyProfitTrend'] = {};

    for (const t of filteredTransactions) {
        const transactionDate = new Date(t.date);
        const monthYear = format(transactionDate, 'MMM/yy');
        if (!monthlyProfitTrend[monthYear]) monthlyProfitTrend[monthYear] = { month: monthYear, profit: 0 };
        
        const updateCategory = (cat: string, type: 'income' | 'expense', amount: number) => {
            if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { income: 0, expenses: 0 };
            const cleanAmount = Math.round(amount * 100) / 100;
            type === 'income' ? categoryBreakdown[cat].income += cleanAmount : categoryBreakdown[cat].expenses += cleanAmount;
        };

        if (t.type === 'income' && !t.category.startsWith('loan')) {
            const cleanAmount = Math.round(t.amount * 100) / 100;
            totalIncome += cleanAmount;
            if (t.category === 'business') {
                businessIncome += cleanAmount;
                monthlyProfitTrend[monthYear].profit += cleanAmount;
                updateCategory(t.category, 'income', cleanAmount);
            } else if (t.category === 'mixed') {
                const businessPortion = Math.round((cleanAmount / 2) * 100) / 100;
                businessIncome += businessPortion;
                monthlyProfitTrend[monthYear].profit += businessPortion;
                updateCategory('business', 'income', businessPortion);
                updateCategory('personal', 'income', cleanAmount - businessPortion);
            } else {
                updateCategory(t.category, 'income', cleanAmount);
            }
        } else if (t.type === 'expense' && !t.category.startsWith('loan')) {
            const cleanAmount = Math.round(t.amount * 100) / 100;
            totalExpenses += cleanAmount;
            if (t.category === 'personal') {
                personalExpenses += cleanAmount;
                updateCategory(t.category, 'expense', cleanAmount);
            } else if (t.category === 'business') {
                businessExpenses += cleanAmount;
                monthlyProfitTrend[monthYear].profit -= cleanAmount;
                updateCategory(t.category, 'expense', cleanAmount);
            } else if (t.category === 'mixed') {
                const businessPortion = Math.round((cleanAmount / 2) * 100) / 100;
                const personalPortion = cleanAmount - businessPortion;
                businessExpenses += businessPortion;
                personalExpenses += personalPortion;
                monthlyProfitTrend[monthYear].profit -= businessPortion;
                updateCategory('business', 'expense', businessPortion);
                updateCategory('personal', 'expense', personalPortion);
            } else {
                updateCategory(t.category, 'expense', cleanAmount);
            }
        }
    }
    
    return {
        totalIncome: Math.round(totalIncome * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        businessNetProfit: Math.round((businessIncome - businessExpenses) * 100) / 100,
        personalSpending: Math.round(personalExpenses * 100) / 100,
        categoryBreakdown,
        monthlyProfitTrend: Object.values(monthlyProfitTrend).map(item => ({
          ...item,
          profit: Math.round(item.profit * 100) / 100
        })).sort((a,b) => new Date('01/' + a.month.replace('/', '/20')).getTime() - new Date('01/' + b.month.replace('/', '/20')).getTime())
    }
}
