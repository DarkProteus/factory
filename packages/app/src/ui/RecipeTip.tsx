import type { RecipeDef } from '@factory/content';
import { countItem, recipeSeconds } from '../craftUi';
import type { Game } from '../game';
import { itemName } from './names';
import './inventory.css';

/** Подсказка рецепта: продукт, ингредиенты «имеется / нужно» (нехватка красным), время; note — строка `bad` внизу. */
export function RecipeTip({ game, def, note }: { game: Game; def: RecipeDef; note?: string }) {
  const inventory = game.getInventory();
  const product = Object.keys(def.out)[0]!;
  return (
    <span className="tip recipe-tip">
      <span className="rt-name">{itemName(product)}</span>
      {Object.entries(def.in).map(([item, need]) => {
        const have = countItem(inventory, item);
        return (
          <span key={item} className={`rt-row${have < need ? ' short' : ''}`}>
            <img src={game.itemIcon(item)} alt="" />
            <span>
              {have} / {need}
            </span>
          </span>
        );
      })}
      <span className="rt-time">{String(recipeSeconds(def)).replace('.', ',')} с</span>
      {note && <span className="rt-note">{note}</span>}
    </span>
  );
}
