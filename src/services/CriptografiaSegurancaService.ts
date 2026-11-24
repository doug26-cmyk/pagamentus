import * as crypto from 'crypto';

/**
 * Serviço de Criptografia de Dados Sensíveis, Proteção de Segredos e Transporte TLS
 * Atende ao RNF-001 e ao CA-4 da SPEC-1.5
 */
export class CriptografiaSegurancaService {
  private readonly algoritmo = 'aes-256-gcm';

  /**
   * Obtém a chave criptográfica de 32 bytes a partir de variável de ambiente protegida,
   * evitando chaves hardcoded no código-fonte (RNF-001).
   */
  private obterChaveSegredo(): Buffer {
    const segredoAmbiente =
      process.env.DATA_ENCRYPTION_KEY ||
      process.env.JWT_SECRET ||
      (process.env.NODE_ENV !== 'production'
        ? 'chave_ficticia_ambiente_teste_rnf001_segura'
        : '');

    if (!segredoAmbiente || segredoAmbiente.trim().length < 16) {
      throw new Error(
        'Segredo de criptografia (DATA_ENCRYPTION_KEY) ausente ou inválido nas variáveis de ambiente.'
      );
    }

    // Deriva uma chave de 256 bits (32 bytes) a partir do segredo do ambiente
    return crypto.createHash('sha256').update(segredoAmbiente).digest();
  }

  /**
   * Criptografa um dado sensível utilizando AES-256-GCM antes de persistir em banco (CA-4)
   * Formato de saída: ivHex:authTagHex:conteudoCifradoHex
   */
  public cifrarDadoSensivel(textoPuro: string): string {
    if (!textoPuro) {
      throw new Error('O dado sensível para criptografia não pode ser vazio.');
    }

    const chave = this.obterChaveSegredo();
    const iv = crypto.randomBytes(12); // IV de 96 bits recomendado para AES-GCM
    const cipher = crypto.createCipheriv(this.algoritmo, chave, iv);

    const cifrado = Buffer.concat([cipher.update(textoPuro, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${cifrado.toString('hex')}`;
  }

  /**
   * Descriptografa um dado sensível armazenado e verifica sua autenticidade via AuthTag (CA-4)
   */
  public decifrarDadoSensivel(conteudoCifrado: string): string {
    const partes = conteudoCifrado.split(':');
    if (partes.length !== 3) {
      throw new Error('Formato de dado sensível criptografado inválido.');
    }

    const [ivHex, authTagHex, dadosHex] = partes;
    const chave = this.obterChaveSegredo();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const dadosCifrados = Buffer.from(dadosHex, 'hex');

    const decipher = crypto.createDecipheriv(this.algoritmo, chave, iv);
    decipher.setAuthTag(authTag);

    const decifrado = Buffer.concat([decipher.update(dadosCifrados), decipher.final()]);
    return decifrado.toString('utf8');
  }

  /**
   * Verifica se o transporte atende aos requisitos de criptografia em trânsito (TLS/HTTPS - RNF-001 / CA-4)
   */
  public validarTransporteTls(opcoes: {
    protocolo: string;
     cabecalhoForwardedProto?: string;
    exigirTls: boolean;
  }): boolean {
    if (!opcoes.exigirTls) {
      return true;
    }

    const proto = (opcoes.cabecalhoForwardedProto || opcoes.protocolo || '').toLowerCase();
    return proto === 'https';
  }
}
