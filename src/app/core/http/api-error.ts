import { HttpErrorResponse } from '@angular/common/http';

/** Erreur d'API normalisée, avec un message affichable à l'utilisateur. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const MESSAGES: Readonly<Record<number, string>> = {
  0: 'Le serveur est injoignable. Vérifiez votre connexion puis réessayez.',
  400: 'La requête est invalide. Vérifiez les informations saisies.',
  401: 'Votre session a expiré. Reconnectez-vous pour continuer.',
  403: "Vous n'avez pas accès à cette ressource.",
  404: 'La ressource demandée est introuvable.',
  409: "Cette opération entre en conflit avec l'état actuel des données.",
};

const SERVER_ERROR_MESSAGE = 'Le serveur a rencontré une erreur. Réessayez dans un instant.';
const FALLBACK_MESSAGE = "Une erreur inattendue s'est produite. Réessayez dans un instant.";

/** Convertit n'importe quelle erreur levée par un appel HTTP en `ApiError`. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  if (error instanceof HttpErrorResponse) {
    const message =
      MESSAGES[error.status] ?? (error.status >= 500 ? SERVER_ERROR_MESSAGE : FALLBACK_MESSAGE);
    return new ApiError(error.status, message, error);
  }
  return new ApiError(-1, FALLBACK_MESSAGE, error);
}
