# One Step Fitness — Curated KB Chunks (paste into Dashboard → Add Chunk)

**IMPORTANT:** Delete the old chunk titled **"One step fitness, Packages & Studio Info (2026)"** — it lists Zumbaton, Zumbuddies, hello@zumbaton.sg, and only 3 classes. That is why the bot keeps saying Zumbaton.

Add these chunks under the **same org your bot uses** (`org_zumbaton` in n8n today).

---

## 1. All Studio Classes (add this FIRST — fixes "what classes do you have?")

**Title:** All Studio Classes — One Step Fitness  
**Category:** Classes  
**Content:**
```
One Step Fitness class lineup (onestepfitness.sg):

ADULT STUDIO CLASSES:
- Groove Stepper — structured step dance choreography, coordination & endurance, 60 min, all levels
- Zumba Step — high-energy step cardio, party-style, 60 min, 500–700 cal, all levels
- Piloxing — Pilates + boxing + dance HIIT fusion, core strength, 60 min, all levels
- Thunderbolt · Bodyweight & Steppers — Tabata HIIT on the step, level 5, 500–800 cal
- Thunderbolt · Resistance & Dance — dance cardio + resistance bands, level 5, 500–800 cal

KIDS (ages 5–12, parent/guardian must accompany):
- Lil Steppers — kids dance fitness, 60 min, beginner friendly

FAMILY:
- One Familia — child + parent bonding classes (one-time family packages)

OUTDOOR:
- ZumFiesta — outdoor dance fitness at OCBC Arena, Kallang

Book or view schedule: onestepfitness.sg/schedule
Trial promos: onestepfitness.sg/promos
```

---

## 2. Adult Package Pricing

**Title:** Adult Packages — Pricing  
**Category:** Pricing  
**Content:**
```
One Step Fitness adult packages (dance fitness & studio classes):

Single Session: $30.00 SGD (1 token, valid 1 month)
4 Session Pack (Most Popular): $99.00 SGD (4 tokens, valid 1 month)
8 Session Pack: $185.00 SGD (8 tokens, valid 1 month)
10 Session Pack: $225.00 SGD (10 tokens, valid 1 month)
Unlimited Session Pack: $265.00 SGD (unlimited tokens, valid 1 month)

All class types included. Book at onestepfitness.sg/pricing
```

---

## 3. Kids Package Pricing

**Title:** Kids Packages — Lil Steppers Pricing  
**Category:** Pricing  
**Content:**
```
One Step Fitness kids packages (ages 5–12, must be accompanied by parent/guardian):

Single Session: $20.00 SGD (1 token, valid 1 month)
Kids 4 Session Pack (Most Popular): $75.00 SGD (4 tokens, valid 1 month)

Parent/guardian required. All class types included. Book at onestepfitness.sg/pricing
```

---

## 4. One Familia Family Packages

**Title:** One Familia — Family Packages  
**Category:** Pricing  
**Content:**
```
One Familia — child + parent bonding classes (one-time purchase):

1 Child + 1 Adult: $38.00 SGD
1 Child + 2 Adults: $56.00 SGD
2 Children + 1 Adult: $58.00 SGD
2 Children + 2 Adults: $76.00 SGD

Book at onestepfitness.sg
```

---

## 5. ZumFiesta Outdoor

**Title:** ZumFiesta — Outdoor Class  
**Category:** Classes  
**Content:**
```
ZumFiesta — outdoor dance fitness at OCBC Arena, Kallang.

Price: $28.00 SGD (1 session included, 1-month validity where applicable)
High-energy open-air workout. Book at onestepfitness.sg/zt-fiesta
```

---

## 6. Trial Promotions

**Title:** 1-for-1 Duo Trial Promotions  
**Category:** Promotions  
**Content:**
```
One Step Fitness trial specials (no hidden referral fees):

Studio Duo Trial: $23 SGD per duo — 60 min studio session. Valid for Zumba Step, Groove Stepper, or Thunderbolt.
Outdoor Duo Trial: $35 SGD per duo — OCBC Arena Kallang outdoor session.

Book at onestepfitness.sg/promos
```

---

## 7. Studio Location & Contact

**Title:** Studio Location, Hours & Contact  
**Category:** General  
**Content:**
```
One Step Fitness studio:
Address: 2 Jalan Klapa, #2-A, Singapore 199314 (Kampong Glam area)
Hours: 8AM – 9PM daily
Phone: +65 8492 7347
Email: hello@onestepfitness.sg
Website: onestepfitness.sg

New students: book a trial at onestepfitness.sg/promos or view schedule at onestepfitness.sg/schedule
```

---

## Optional: individual class chunks (better search for specific class questions)

Copy each if you want — or rely on chunk #1 above.

| Title | Category | One-line content |
|---|---|---|
| Groove Stepper | Classes | Structured step dance choreography. 60 min, 400–600 cal, all levels. |
| Zumba Step | Classes | High-energy step cardio, party-style. 60 min, 500–700 cal, all levels. |
| Piloxing | Classes | Pilates + boxing + dance HIIT. 60 min, 400–600 cal, all levels. |
| Thunderbolt · Bodyweight & Steppers | Classes | Tabata HIIT on the step. Level 5. 60 min, 500–800 cal. Coach Robert. |
| Thunderbolt · Resistance & Dance | Classes | Dance cardio + resistance bands. Level 5. 60 min, 500–800 cal. Coach Fizah. |
| Lil Steppers | Classes | Kids dance fitness, ages 5–12. Guardian required. 60 min, beginner friendly. |

---

## Cleanup checklist

1. **Delete** chunk: "One step fitness, Packages & Studio Info (2026)" (has Zumbaton / zumbaton.sg)
2. **Add** chunks 1–7 above (minimum: add **#1 All Studio Classes** + **#7 Studio Location**)
3. Optionally delete duplicate scraped marketing chunks (42 is a lot — bot only sees 4 at a time)
4. Test: "What classes do you have?" → should list Groove Stepper, Zumba Step, Piloxing, Thunderbolt, Lil Steppers, One Familia, ZumFiesta
