"use client";

/**
 * PIXEL REALM ONLINE — Shop Panel
 *
 * NPC merchant where players buy and sell items.
 * Two tabs: Buy (shop catalogue) and Sell (player inventory).
 * All transactions are client-side; gold and inventory state
 * are lifted up and managed by mini-app.tsx.
 */

import { useState } from "react";
import type { CSSProperties } from "react";
import type { Item, ItemType } from "../types";

// ---- Shop catalogue -------------------------------------------------------

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  itemType: ItemType;
  buyPrice: number;
  stats?: { attack?: number; defense?: number; hp?: number };
  quantity: number; // always 1 per purchase
}

const SHOP_CATALOGUE: ShopItem[] = [
  // Potions
  {
    id: "shop_potion_small",
    name: "Small Potion",
    description: "Restores 50 HP",
    itemType: "potion",
    buyPrice: 20,
    stats: { hp: 50 },
    quantity: 1,
  },
  {
    id: "shop_potion_medium",
    name: "Medium Potion",
    description: "Restores 150 HP",
    itemType: "potion",
    buyPrice: 60,
    stats: { hp: 150 },
    quantity: 1,
  },
  {
    id: "shop_potion_large",
    name: "Large Potion",
    description: "Restores 350 HP",
    itemType: "potion",
    buyPrice: 140,
    stats: { hp: 350 },
    quantity: 1,
  },
  // Weapons
  {
    id: "shop_iron_sword",
    name: "Iron Sword",
    description: "+12 ATK",
    itemType: "weapon",
    buyPrice: 80,
    stats: { attack: 12 },
    quantity: 1,
  },
  {
    id: "shop_steel_sword",
    name: "Steel Sword",
    description: "+22 ATK",
    itemType: "weapon",
    buyPrice: 180,
    stats: { attack: 22 },
    quantity: 1,
  },
  {
    id: "shop_magic_staff",
    name: "Magic Staff",
    description: "+18 ATK, magic-type",
    itemType: "weapon",
    buyPrice: 220,
    stats: { attack: 18 },
    quantity: 1,
  },
  {
    id: "shop_hunters_bow",
    name: "Hunter's Bow",
    description: "+15 ATK, ranged",
    itemType: "weapon",
    buyPrice: 160,
    stats: { attack: 15 },
    quantity: 1,
  },
  // Armor
  {
    id: "shop_leather_armor",
    name: "Leather Armor",
    description: "+10 DEF",
    itemType: "armor",
    buyPrice: 70,
    stats: { defense: 10 },
    quantity: 1,
  },
  {
    id: "shop_chain_mail",
    name: "Chain Mail",
    description: "+20 DEF",
    itemType: "armor",
    buyPrice: 160,
    stats: { defense: 20 },
    quantity: 1,
  },
  {
    id: "shop_plate_armor",
    name: "Plate Armor",
    description: "+35 DEF, +30 HP",
    itemType: "armor",
    buyPrice: 300,
    stats: { defense: 35, hp: 30 },
    quantity: 1,
  },
  // Materials
  {
    id: "shop_iron_ore",
    name: "Iron Ore",
    description: "Crafting material",
    itemType: "material",
    buyPrice: 15,
    quantity: 1,
  },
  {
    id: "shop_magic_crystal",
    name: "Magic Crystal",
    description: "Rare crafting material",
    itemType: "material",
    buyPrice: 90,
    quantity: 1,
  },
];

// ---- Item icons / rarity --------------------------------------------------

const ITEM_ICONS: Record<ItemType, string> = {
  weapon:   "⚔️",
  armor:    "🛡️",
  potion:   "🧪",
  gold:     "💰",
  material: "🪨",
};

function getRarityColor(price: number): string {
  if (price >= 250) return "#ff8800";
  if (price >= 150) return "#cc44ff";
  if (price >= 80)  return "#4488ff";
  if (price >= 30)  return "#44cc44";
  return "#aaaaaa";
}

function getSellPrice(item: Item): number {
  return Math.max(1, Math.floor(item.value * 0.4));
}

// ---- Sell confirmation notification ---------------------------------------

interface ToastProps {
  message: string;
  type: "buy" | "sell" | "error";
}

// ---- ShopPanel props -------------------------------------------------------

interface ShopPanelProps {
  gold: number;
  inventory: Item[];
  onBuy: (item: ShopItem) => void;
  onSell: (item: Item) => void;
  onClose: () => void;
}

// ---- Main Component --------------------------------------------------------

export function ShopPanel({ gold, inventory, onBuy, onSell, onClose }: ShopPanelProps) {
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [filterType, setFilterType] = useState<ItemType | "all">("all");
  const [toast, setToast] = useState<ToastProps | null>(null);
  const [confirmSell, setConfirmSell] = useState<Item | null>(null);

  const showToast = (message: string, type: ToastProps["type"]) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  };

  const handleBuy = (item: ShopItem) => {
    if (gold < item.buyPrice) {
      showToast("Not enough gold!", "error");
      return;
    }
    onBuy(item);
    showToast(`Bought ${item.name}`, "buy");
  };

  const handleSell = (item: Item) => {
    setConfirmSell(item);
  };

  const confirmSellItem = () => {
    if (!confirmSell) return;
    onSell(confirmSell);
    showToast(`Sold ${confirmSell.name} for ${getSellPrice(confirmSell)}g`, "sell");
    setConfirmSell(null);
  };

  const filteredCatalogue = filterType === "all"
    ? SHOP_CATALOGUE
    : SHOP_CATALOGUE.filter(i => i.itemType === filterType);

  const sellableInventory = inventory.filter(i => i.itemType !== "gold");

  const FILTER_TABS: { label: string; value: ItemType | "all" }[] = [
    { label: "All", value: "all" },
    { label: "⚔️", value: "weapon" },
    { label: "🛡️", value: "armor" },
    { label: "🧪", value: "potion" },
    { label: "🪨", value: "material" },
  ];

  return (
    <div style={{
      position: "absolute",
      inset: 0,
      zIndex: 600,
      display: "flex",
      alignItems: "flex-end",
      background: "rgba(0,0,0,0.65)",
      backdropFilter: "blur(3px)",
    }}>
      {/* Tap outside to close */}
      <div style={{ position: "absolute", inset: 0 }} onClick={onClose} />

      {/* Panel */}
      <div style={{
        position: "relative",
        width: "100%",
        maxHeight: "82dvh",
        background: "linear-gradient(180deg, #1a0a2e 0%, #0f0820 100%)",
        border: "1px solid rgba(240,180,41,0.35)",
        borderBottom: "none",
        borderRadius: "16px 16px 0 0",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>

        {/* Header */}
        <div style={{
          padding: "14px 16px 10px",
          borderBottom: "1px solid rgba(240,180,41,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🏪</span>
            <div>
              <div style={{ color: "#f0b429", fontSize: 14, fontWeight: "bold", letterSpacing: 1 }}>
                Merchant's Shop
              </div>
              <div style={{ color: "#888", fontSize: 9, marginTop: 1 }}>
                Browse, buy, and sell items
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              background: "rgba(240,180,41,0.15)",
              border: "1px solid rgba(240,180,41,0.4)",
              borderRadius: 6,
              padding: "4px 10px",
              color: "#f0b429",
              fontSize: 13,
              fontWeight: "bold",
            }}>
              💰 {gold}g
            </div>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 6,
                color: "#aaa",
                fontSize: 16,
                width: 32,
                height: 32,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Buy / Sell tabs */}
        <div style={{
          display: "flex",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
        }}>
          {(["buy", "sell"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: "10px 0",
                background: tab === t ? "rgba(240,180,41,0.12)" : "transparent",
                border: "none",
                borderBottom: tab === t ? "2px solid #f0b429" : "2px solid transparent",
                color: tab === t ? "#f0b429" : "#666",
                fontSize: 12,
                fontFamily: "monospace",
                fontWeight: tab === t ? "bold" : "normal",
                cursor: "pointer",
                letterSpacing: 1,
                transition: "all 0.15s ease",
              }}
            >
              {t === "buy" ? "🛒 BUY" : "💸 SELL"}
            </button>
          ))}
        </div>

        {/* Buy tab — filter row */}
        {tab === "buy" && (
          <div style={{
            display: "flex",
            gap: 6,
            padding: "8px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            flexShrink: 0,
            overflowX: "auto",
          }}>
            {FILTER_TABS.map(f => (
              <button
                key={f.value}
                onClick={() => setFilterType(f.value)}
                style={{
                  background: filterType === f.value ? "rgba(240,180,41,0.2)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${filterType === f.value ? "rgba(240,180,41,0.5)" : "rgba(255,255,255,0.1)"}`,
                  borderRadius: 4,
                  color: filterType === f.value ? "#f0b429" : "#888",
                  fontSize: 11,
                  padding: "4px 10px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  minHeight: 28,
                  transition: "all 0.1s ease",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Content area */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 12px 16px",
        }}>

          {/* ── BUY TAB ── */}
          {tab === "buy" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {filteredCatalogue.map(item => {
                const canAfford = gold >= item.buyPrice;
                const rarityColor = getRarityColor(item.buyPrice);
                return (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      background: "rgba(255,255,255,0.04)",
                      border: `1px solid ${rarityColor}30`,
                      borderRadius: 8,
                      padding: "10px 12px",
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      width: 40,
                      height: 40,
                      background: `${rarityColor}18`,
                      border: `1px solid ${rarityColor}40`,
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                      flexShrink: 0,
                    }}>
                      {ITEM_ICONS[item.itemType]}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        color: rarityColor,
                        fontSize: 12,
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}>
                        {item.name}
                      </div>
                      <div style={{ color: "#666", fontSize: 10, marginTop: 2 }}>
                        {item.description}
                      </div>
                      {item.stats && (
                        <div style={{ display: "flex", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
                          {item.stats.attack  && <span style={statBadge("#ff6644")}>ATK +{item.stats.attack}</span>}
                          {item.stats.defense && <span style={statBadge("#44aaff")}>DEF +{item.stats.defense}</span>}
                          {item.stats.hp      && <span style={statBadge("#44cc44")}>HP +{item.stats.hp}</span>}
                        </div>
                      )}
                    </div>

                    {/* Price + buy */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                      <div style={{
                        color: canAfford ? "#f0b429" : "#553a00",
                        fontSize: 12,
                        fontWeight: "bold",
                      }}>
                        {item.buyPrice}g
                      </div>
                      <button
                        onClick={() => handleBuy(item)}
                        disabled={!canAfford}
                        style={{
                          background: canAfford
                            ? "linear-gradient(135deg, #7c3aed, #4f46e5)"
                            : "rgba(255,255,255,0.05)",
                          border: `1px solid ${canAfford ? "#a78bfa" : "rgba(255,255,255,0.1)"}`,
                          borderRadius: 6,
                          color: canAfford ? "white" : "#444",
                          fontSize: 10,
                          fontFamily: "monospace",
                          padding: "5px 12px",
                          cursor: canAfford ? "pointer" : "not-allowed",
                          letterSpacing: 0.5,
                          minHeight: 28,
                          transition: "all 0.1s ease",
                        }}
                      >
                        BUY
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredCatalogue.length === 0 && (
                <EmptyState icon="🔍" message="No items in this category" />
              )}
            </div>
          )}

          {/* ── SELL TAB ── */}
          {tab === "sell" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {sellableInventory.length === 0 && (
                <EmptyState icon="🎒" message="Your inventory is empty" />
              )}

              {sellableInventory.map(item => {
                const sellPrice = getSellPrice(item);
                const rarityColor = getRarityColor(item.value);
                return (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      background: "rgba(255,255,255,0.04)",
                      border: `1px solid ${rarityColor}30`,
                      borderRadius: 8,
                      padding: "10px 12px",
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      width: 40,
                      height: 40,
                      background: `${rarityColor}18`,
                      border: `1px solid ${rarityColor}40`,
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                      flexShrink: 0,
                    }}>
                      {ITEM_ICONS[item.itemType]}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        color: rarityColor,
                        fontSize: 12,
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}>
                        {item.name}
                        {item.quantity > 1 && (
                          <span style={{ color: "#888", fontWeight: "normal", marginLeft: 6 }}>×{item.quantity}</span>
                        )}
                      </div>
                      <div style={{ color: "#666", fontSize: 10, marginTop: 2 }}>{item.description}</div>
                    </div>

                    {/* Sell price + button */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                      <div style={{ color: "#f0b429", fontSize: 12, fontWeight: "bold" }}>
                        +{sellPrice}g
                      </div>
                      <button
                        onClick={() => handleSell(item)}
                        style={{
                          background: "rgba(240,180,41,0.15)",
                          border: "1px solid rgba(240,180,41,0.4)",
                          borderRadius: 6,
                          color: "#f0b429",
                          fontSize: 10,
                          fontFamily: "monospace",
                          padding: "5px 12px",
                          cursor: "pointer",
                          letterSpacing: 0.5,
                          minHeight: 28,
                          transition: "all 0.1s ease",
                        }}
                      >
                        SELL
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sell confirmation modal */}
        {confirmSell && (
          <div style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}>
            <div style={{
              background: "#1a0a2e",
              border: "1px solid rgba(240,180,41,0.4)",
              borderRadius: 12,
              padding: 20,
              width: "100%",
              maxWidth: 280,
              textAlign: "center",
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{ITEM_ICONS[confirmSell.itemType]}</div>
              <div style={{ color: "#f0f0f0", fontSize: 13, fontWeight: "bold", marginBottom: 6 }}>
                Sell {confirmSell.name}?
              </div>
              <div style={{ color: "#888", fontSize: 11, marginBottom: 16 }}>
                You'll receive <span style={{ color: "#f0b429", fontWeight: "bold" }}>{getSellPrice(confirmSell)}g</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setConfirmSell(null)}
                  style={{
                    flex: 1,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 8,
                    color: "#aaa",
                    fontSize: 12,
                    padding: "10px 0",
                    cursor: "pointer",
                    fontFamily: "monospace",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSellItem}
                  style={{
                    flex: 1,
                    background: "rgba(240,180,41,0.2)",
                    border: "1px solid rgba(240,180,41,0.5)",
                    borderRadius: 8,
                    color: "#f0b429",
                    fontSize: 12,
                    padding: "10px 0",
                    cursor: "pointer",
                    fontFamily: "monospace",
                    fontWeight: "bold",
                  }}
                >
                  Sell it
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast notification */}
        {toast && (
          <div style={{
            position: "absolute",
            top: 70,
            left: "50%",
            transform: "translateX(-50%)",
            background: toast.type === "error"
              ? "rgba(200,40,40,0.9)"
              : toast.type === "buy"
                ? "rgba(124,58,237,0.9)"
                : "rgba(240,180,41,0.9)",
            border: `1px solid ${toast.type === "error" ? "#ff4444" : toast.type === "buy" ? "#a78bfa" : "#f0b429"}`,
            borderRadius: 8,
            padding: "8px 18px",
            color: "white",
            fontSize: 12,
            fontFamily: "monospace",
            fontWeight: "bold",
            whiteSpace: "nowrap",
            zIndex: 10,
            pointerEvents: "none",
          }}>
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Helpers ---------------------------------------------------------------

function statBadge(color: string): CSSProperties {
  return {
    background: `${color}18`,
    border: `1px solid ${color}40`,
    borderRadius: 3,
    color,
    fontSize: 9,
    padding: "1px 5px",
  };
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div style={{
      textAlign: "center",
      padding: "40px 0",
      color: "#444",
    }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 12 }}>{message}</div>
    </div>
  );
}
