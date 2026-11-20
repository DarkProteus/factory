/** Ошибка загрузки сохранения; сообщение на русском, пригодно для показа игроку. */
export class SaveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SaveError';
  }
}
