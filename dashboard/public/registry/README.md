# Reyestr loyihalarining suratlari

Bu papkaga **«Лойиҳалар реестри 2026–2030»** bo'limidagi loyihalarning surati
qo'yiladi. Dashboard'da ular loyiha tafsiloti oynasining markazidagi
**«Лойиҳа майдони»** blokida chiziladi — `«Инвестиция лойиҳалари» → «Паспорт»`
bilan bir xil shablonda.

Hozir papkada **44 ta fayl** bor. Ular `Инв. лойиҳалар 2026-2030_03-08-2026+++.pptx`
taqdimotidan ajratib olingan, nom bo'yicha moslashtirilgan va har biri ko'z
bilan tekshirilgan (skrinshot, logotip va klipart rad etilgan).

Reyestrda (`ТМК_Лойиҳалари_…xlsx`) surat ustuni **yo'q**, shuning uchun 144 ta
loyihaning **100 tasida surat yo'q**. Bu xato emas — shunday.

## Fayl nomini dashboard qayerdan biladi

**Manba — baza.** Fayl nomi `project_registry_projects.image` ustunida turadi
va API uni **shundayligicha**, faqat fayl nomi sifatida qaytaradi:

```
GET /project-registry/dashboard → data.projects[].image
GET /project-registry/:id       → data.image

image: "094.jpg" | null      // yo'l ham, host ham YO'Q
```

To'liq manzilni iste'molchi yig'adi — dashboard uni
`${import.meta.env.BASE_URL}registry/${image}` ko'rinishida quradi
(`src/lib/adapters/projectRegistry.ts`, `RegArea.src`). Bu
`geology_projects.photoPath` bilan bir xil kontrakt.

`image === null` bo'lsa **manzil umuman yasalmaydi** va `<img>` element ham
chizilmaydi: yo'q faylga so'rov yuborib konsolni 404 bilan to'ldirish —
«ma'lumot yo'q» ni «nosozlik» ga aylantirish bo'lardi.

### ⚠️ Fayl nomi `id` dan yasalmaydi

Ilgari manzil `public/registry/{id}.jpg` deb qurilardi. Bu noto'g'ri edi:
fayllar taqdimotdagi o'z tartib raqami bilan atalgan (`001.jpg` … `105.jpg`) va
ular loyihaning baza `id` si bilan hamma joyda mos kelmaydi. Endi bog'lanish
faqat `image` ustuni orqali, bir qiymatli.

### ⚠️ Nomga qarab o'xshatib surat ulanmaydi

`public/invest/` da 7 ta surat bor (`ingichka.jpg`, `miskon.jpg` va h.k.), lekin
ular bu yerga **ko'chirilmaydi va nom bo'yicha bog'lanmaydi**. Reyestrda 144 ta
qator bor va ularning nomi investitsiya loyihalari nomiga o'xshash bo'lishi
mumkin; o'xshashlikka qarab biriktirilgan surat butunlay boshqa obyektni
ko'rsatib qo'yardi va buni ekrandan sezib bo'lmasdi — noto'g'ri surat ishonarli
ko'rinadi.

Xuddi shu sabab koordinata uchun ham yozilgan:
`backend/src/modules/project-registry/project-registry.regions.ts`.

## Yangi surat qo'shish — ikki qadam

Faqat faylni papkaga tashlash **yetarli emas**: dashboard fayllar ro'yxatini
o'qiy olmaydi, u faqat bazadagi nomni biladi.

1. Faylni shu papkaga qo'ying (nomi ixtiyoriy, pastdagi format talabiga mos).
2. O'sha nomni bazaga yozing — `project_registry_projects.image`. Namuna:
   `backend/src/migrations/1788480000000-ProjectRegistryImage.ts`.

⚠️ **Import bu ustunga tegmaydi va tegmasligi kerak.** Qiymat Excel'da yo'q,
migratsiyadan keladi; `REGISTRY_COLUMNS` da `image` yo'q va import qisman
`update()` ishlatadi, ya'ni qayta importda surat yo'qolmaydi. Buni
`backend/src/modules/project-registry/project-registry.image.spec.ts` qulflab
turadi.

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

## Surat bo'lmasa nima bo'ladi — ikkita HAR XIL holat

Hech narsa buzilmaydi, lekin ikkalasi bir xil ko'rinmaydi
(`src/components/AreaPhoto.tsx`):

| Holat | Ekranda | Ma'nosi |
|---|---|---|
| `image === null` | **«Бу лойиҳа учун сурат йўқ»** | Manbada surat biriktirilmagan. Ma'lum, hal qilingan holat — xato emas |
| `image` bor, fayl kelmadi | **«Сурат юкланмаган»** + fayl nomi | Bazada `094.jpg` deyilgan, lekin fayl bu papkada yo'q yoki deployda tushib qolgan — **haqiqiy nosozlik** |

Ular ataylab ajratilgan: bitta matn ostiga yig'ilsa, yo'qolgan fayl jimgina
«tabiiy holat» bo'lib qolib ketardi. Ikkala holatda ham singan rasm ikonkasi
ko'rinmaydi, va surat ostidagi ko'rsatkichlar (yer maydoni, hudud, xaritadagi
nuqta, quvvat) baribir reyestrdan olinib chiziladi — ular suratga bog'liq emas.

## Qayerga tushadi

Bu papka `public/` ichida — fayllar bundle'ga kirmaydi, build paytida
`dist/registry/` ga o'zgarishsiz ko'chiriladi.
