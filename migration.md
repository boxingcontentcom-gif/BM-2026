# Fight Simulator Rebalance Migration

### 🥊 Replacement Logic

#### **1. Stamina Cost**
Replace the old stamina calculation with:
```javascript
const pData = this.PUNCH_DATA[punchType];
const BASE_STAM = 5;
const staminaBurn = adjustments.staminaBurn || 1.0;
const comboDiscounts = [1.0, 0.7, 0.6];
const discount = comboDiscounts[Math.min(comboCount, 2)];

let staminaCost = pData.stamMult * BASE_STAM * staminaBurn * discount;

if (att.stunState) staminaCost *= 0.8; // STUNNED_STAM_FACTOR
// If miss, later multiply by 0.7
```

#### **2. Accuracy & Graded Hits**
Replace hard auto-miss logic with:
```javascript
const softGap = accuracyScore - targetDefense;
let hitType = 'NORMAL';
let dmgMod = 1.0;

if (softGap < -10) {
    hitType = 'GLANCING';
    dmgMod = 0.25;
} else if (softGap < 0) {
    hitType = 'REDUCED';
    dmgMod = 0.60;
}
```

#### **3. Damage Calculation**
```javascript
const QUALITY_DENOM = 80;
const quality = (attStats.offenceIQ + attStats.technique) / QUALITY_DENOM * pData.damageMult;
let damage = attStats.power * quality * comboDmgMod * weightMult;

// Power Advantage
const punchBlockFactor = PUNCH_BLOCK_FACTORS[punchType];
const defBlock = defStats.guard * punchBlockFactor;
const powerAdv = attStats.power - defBlock;

if (powerAdv > 8) {
    damage = Math.max(damage, powerAdv * 0.45);
}
```

#### **4. Block Penetration**
```javascript
const blockMitigationBase = 1 - Math.min(0.6, defBlock / 200);
const blockPenetration = Math.min(0.5, powerAdv / 40);
const finalMitigation = blockMitigationBase * (1 - blockPenetration);
damage *= finalMitigation;
```

#### **5. KO and Rematch Bias**
```javascript
if (ratingDiff >= 10 && healthPct < 0.5) {
    let koChance = 0.03 + Math.min(0.25, (ratingDiff - 10) * 0.02) + (1 - healthPct) * 0.15;
    if (isRematch) koChance += 0.05;
    if (Math.random() < koChance) { /* Trigger KO */ }
}
```
