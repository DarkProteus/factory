import { expect, it } from 'vitest';
import { PACKAGE } from './index';

it('пакет render подключён', () => {
  expect(PACKAGE).toBe('@factory/render');
});
