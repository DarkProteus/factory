import { expect, it } from 'vitest';
import { PACKAGE } from './index';

it('пакет save подключён', () => {
  expect(PACKAGE).toBe('@factory/save');
});
