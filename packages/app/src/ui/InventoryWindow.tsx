import { isUnlocked } from '@factory/sim';
import { canCraft, craftCommand, inventoryCells, manualRecipes } from '../craftUi';
import type { Game } from '../game';
import { Panel } from './BuildPanel';
import { ItemSlot } from './ItemSlot';
import { RecipeTip } from './RecipeTip';
import { useTick } from './useTick';
import './inventory.css';

/** Окно инвентаря (E): слева ячейки, справа рецепты ручного крафта. Рисуется, только пока открыто. */
export function InventoryWindow({ game }: { game: Game }) {
  useTick(game);
  if (!game.isInventoryOpen()) return null;
  const inventory = game.getInventory();
  const state = game.getState();
  // В окне крафта только рецепты, открытые исследованиями.
  const recipes = manualRecipes(undefined, (id) => isUnlocked(state, id));
  return (
    <div className="inventory-window">
      <Panel title="Инвентарь">
        <div className="inv-columns">
          <div className="inv-grid">
            {inventoryCells(inventory).map((cell, i) => (
              <ItemSlot key={i} game={game} item={cell?.item ?? null} count={cell?.count} />
            ))}
          </div>
          <div>
            <h3>Ручной крафт</h3>
            <div className="recipe-grid">
              {recipes.map(({ id, def }) => {
                const ok = canCraft(inventory, def);
                return (
                  <button
                    key={id}
                    type="button"
                    className={`btn${ok ? '' : ' off'}`}
                    aria-disabled={!ok}
                    onClick={(e) => ok && game.command(craftCommand(game.getInventory(), id, e.shiftKey))}
                  >
                    <img src={game.itemIcon(Object.keys(def.out)[0]!)} alt={id} />
                    <RecipeTip game={game} def={def} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
