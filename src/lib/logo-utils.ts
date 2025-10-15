// Utilitário para converter o logo em base64 para uso no PDF
export async function getLogoBase64(): Promise<string> {
  try {
    // Tentar carregar o logo da pasta public
    const response = await fetch('/logo.png');
    if (!response.ok) {
      throw new Error('Logo não encontrado');
    }
    
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('Erro ao carregar logo:', error);
    // Retornar um logo padrão em base64 (quadrado azul simples)
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  }
}
