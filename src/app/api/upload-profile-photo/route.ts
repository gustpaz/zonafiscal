import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { createSuccessResponse, createErrorResponse, logSecurityEvent } from '@/lib/api-validation';
import { validateFile, SECURITY_LIMITS } from '@/lib/validation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Configurar Cloudinary
cloudinary.config({
  cloudinary_url: process.env.CLOUDINARY_URL
});

export async function POST(req: Request) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse('Não autorizado', 401);
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    // Validação de entrada
    if (!file || !userId) {
      logSecurityEvent('Upload attempt without file or userId', { userId }, req);
      return createErrorResponse('Arquivo ou userId não fornecido', 400);
    }

    // Validar userId
    if (userId !== session.user.id) {
      logSecurityEvent('Upload attempt with different userId', { userId, sessionId: session.user.id }, req);
      return createErrorResponse('Não autorizado a fazer upload para este usuário', 403);
    }

    // Validar arquivo
    const fileValidation = validateFile(file);
    if (!fileValidation.valid) {
      logSecurityEvent('Invalid file upload attempt', { fileName: file.name, error: fileValidation.error }, req);
      return createErrorResponse(fileValidation.error || 'Arquivo inválido', 400);
    }

    // Converter File para Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload para Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'profile-photos',
          public_id: userId,
          overwrite: true,
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    const uploadResult = result as any;

    return createSuccessResponse({
      success: true,
      url: uploadResult.secure_url,
      message: 'Foto de perfil atualizada com sucesso'
    });

  } catch (error: any) {
    logSecurityEvent('Upload error', { error: error.message }, req);
    console.error('Erro no upload:', error);
    return createErrorResponse('Erro ao fazer upload da foto de perfil', 500);
  }
}

