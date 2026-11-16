import { expect, it } from 'vitest';
import { packages } from './App';

it('app видит все пакеты рабочего пространства', () => {
  expect(packages).toEqual(['@factory/sim', '@factory/content', '@factory/render', '@factory/save']);
});
