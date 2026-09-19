# Reyestr loyihalarining suratlari

Bu papkaga **«Лойиҳалар реестри 2026–2030»** bo'limidagi loyihalarning surati
qo'yiladi. Dashboard'da ular loyiha tafsiloti oynasining markazidagi
**«Лойиҳа майдони»** blokida chiziladi — `«Инвестиция лойиҳалари» → «Паспорт»`
bilan bir xil shablonda.

Surat qo'lda qo'yiladi: reyestrda (`ТМК_Лойиҳалари_…xlsx`) surat ustuni umuman
yo'q. Hozircha bu papkada **birorta fayl yo'q**, ya'ni 144 ta loyihaning
hammasida «Сурат юкланмаган» plashkasi turadi. Bu xato emas — shunday
mo'ljallangan.

## Fayl nomlari

Fayl nomi loyihaning **baza identifikatori** (`id`) bilan aynan bir xil
bo'lishi shart, kengaytmasi `.jpg`:

```
public/registry/67.jpg    →  id = 67  (Чирчиқ шаҳрида «Келажак металлари технопарки»)
public/registry/31.jpg    →  id = 31  («Мискон» мис-порфирли кони)
```

`id` ni topish oson: loyiha tafsiloti ochilganda manzil `#registry/67` bo'ladi —
oxirgi son o'sha `id`.

### ⚠️ Nomga qarab o'xshatib surat ulanmaydi

`public/invest/` da 7 ta surat bor (`ingichka.jpg`, `miskon.jpg` va h.k.), lekin
ular bu yerga **ko'chirilmaydi va nom bo'yicha bog'lanmaydi**. Reyestrda 144 ta
qator bor va ularning nomi investitsiya loyihalari nomiga o'xshash bo'lishi
mumkin; o'xshashlikka qarab biriktirilgan surat butunlay boshqa obyektni
ko'rsatib qo'yardi va buni ekrandan sezib bo'lmasdi — noto'g'ri surat ishonarli
ko'rinadi. Shuning uchun bog'lanish faqat `id` bo'yicha, bir qiymatli.

Xuddi shu sabab koordinata uchun ham yozilgan:
`backend/src/modules/project-registry/project-registry.regions.ts`.

## O'lcham va format

| Talab | Qiymat |
|---|---|
| Nisbat | **16:10** — barcha loyihada bir xil |
| Tavsiya etilgan o'lcham | **1600 × 1000 px** |
| Eng kichik o'lcham | 1200 × 750 px |
| Format | JPEG (`.jpg`) |
| Fayl hajmi | 500 KB gacha |

Nisbat 16:10 dan farq qilsa surat qirqiladi (`object-cover`) — markazi
saqlanadi, chetlari kesiladi.

## Surat bo'lmasa nima bo'ladi

Hech narsa buzilmaydi. Fayl topilmasa blok o'rnida xotirjam
**«Сурат юкланмаган»** plashkasi turadi (`src/components/AreaPhoto.tsx`), singan
rasm ikonkasi ko'rinmaydi, va surat ostidagi ko'rsatkichlar (yer maydoni, hudud,
xaritadagi nuqta, quvvat) baribir reyestrdan olinib chiziladi.

## Qayerga tushadi

Bu papka `public/` ichida — fayllar bundle'ga kirmaydi, build paytida
`dist/registry/` ga o'zgarishsiz ko'chiriladi. Surat qo'shish uchun kodga tegish
shart emas: faylni shu yerga qo'ying va qayta build qiling.
