
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/lib/error-emitter';
import type { FirestorePermissionError } from '@/lib/errors';

export default function FirebaseErrorListener() {
  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      // The Next.js development overlay will automatically pick up
      // uncaught exceptions. By throwing the error here, we ensure it's
      // displayed in the overlay, providing rich, contextual feedback
      // directly in the development environment.
      throw error;
    };

    errorEmitter.on('permission-error', handlePermissionError);

    // No cleanup function is returned, as the emitter should persist
    // for the lifetime of the application.
  }, []);

  return null; // This component does not render anything.
}
