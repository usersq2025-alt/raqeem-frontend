# إضافة مرحلة مقر جديدة (Headquarters Stage)

المصدر المركزي:

- كتالوج المراحل: `src/lib/config/headquartersStages.catalog.ts`
- منطق العرض: `src/lib/config/headquartersStages.ts`
- جاهزية الصور (مولَّد): `src/lib/config/generated/hqAssets.generated.ts`
- مسار الباك-إند: `app/Support/StoreProgression.php`
- أسعار المتجر: `StoreItem.price_points` عبر `DoctorHeadquartersStoreSeeder`

---

## كيف أضيف صور المرحلة التالية؟

### الطريقة السريعة (موصى بها)

بوت محلي يختار الأداة من البروتوكول ويضع التسمية الصحيحة ثم يشغّل `sync:hq` (والنشر اختياري):

```bash
npm run hq:bot
# أو واجهة متصفح:
npm run hq:bot -- --ui
```

السعر لا يُدخل يدويًا — جاهز من `DoctorHeadquartersStoreSeeder` / `StoreItem`.

### يدويًا

1. اعرف رقم المرحلة و`itemSlug` من الجدول أدناه.
2. ولّد صورة الأداة بخلفية شفافة بنفس أسلوب الأدوات السابقة.
3. ولّد صورة المقر التراكمية (الغرفة + كل الأدوات حتى هذه المرحلة) بنفس أبعاد `1024×682`.
4. ضع الملفين:
   - `public/images/headquarters/doctor/items/item-NN-{slug}.png`
   - `public/images/headquarters/doctor/stages/stage-NN-{slug}.png`
5. شغّل المزامنة:

```bash
npm run sync:hq
```

(يُنفَّذ تلقائيًا قبل `dev` و`build` عبر `predev` / `prebuild`.)

6. تأكد أن `StoreItem` موجود بالسعر الصحيح (`php artisan db:seed --class=DoctorHeadquartersStoreSeeder`).
7. شغّل الاختبارات:

```bash
npm run test:hq
# في مجلد الباك-إند:
php artisan test --filter=LessonPoints
php artisan test --filter=DoctorHeadquarters
php artisan test --filter=StoreProgression
```

8. جرّب الشراء بحساب طالب في المرحلة السابقة مباشرة.

لا تعدّل JSX ولا تضف شرط `if (item === …)` داخل المكونات.

---

## جدول مسار عيادة الطبيب (الغرفة 1)

| المرحلة | storeSlotKey | itemKey | الاسم | السعر | item image | stage image |
|---:|---|---|---|---:|---|---|
| 0 | — | — | العيادة الفارغة | 0 | — | `stage-00-empty.png` |
| 1 | `heartbeat_rug` | `doctor_heartbeat_rug` | سجادة نبض القلب | 6 | `item-01-heartbeat-rug.png` | `stage-01-heartbeat-rug.png` |
| 2 | `doctor_desk` | `doctor_doctor_desk` | مكتب الطبيب | 12 | `item-02-doctor-desk.png` | `stage-02-doctor-desk.png` |
| 3 | `doctor_chair` | `doctor_doctor_chair` | كرسي الطبيب | 24 | `item-03-doctor-chair.png` | `stage-03-doctor-chair.png` |
| 4 | `medical_tablet` | `doctor_medical_tablet` | الجهاز اللوحي الطبي | 30 | `item-04-medical-tablet.png` | `stage-04-medical-tablet.png` |
| 5 | `stethoscope` | `doctor_stethoscope` | سماعة الطبيب | 36 | `item-05-stethoscope.png` | `stage-05-stethoscope.png` |
| 6 | `medicine_cabinet` | `doctor_medicine_cabinet` | خزانة الأدوية | 36 | `item-06-medicine-cabinet.png` | `stage-06-medicine-cabinet.png` |
| 7 | `exam_bed` | `doctor_exam_bed` | سرير الفحص | 42 | `item-07-exam-bed.png` | `stage-07-exam-bed.png` |
| 8 | `exam_lamp` | `doctor_exam_lamp` | مصباح الفحص | 42 | `item-08-exam-lamp.png` | `stage-08-exam-lamp.png` |
| 9 | `microscope` | `doctor_microscope` | المجهر | 48 | `item-09-microscope.png` | `stage-09-microscope.png` |
| 10 | `anatomy_model` | `doctor_anatomy_model` | النموذج التشريحي | 48 | `item-10-anatomy-model.png` | `stage-10-anatomy-model.png` |
| 11 | `diagnostic_station` | `doctor_diagnostic_station` | محطة القياس والتشخيص | 54 | `item-11-diagnostic-station.png` | `stage-11-diagnostic-station.png` |
| 12 | `achievement_shelf` | `doctor_achievement_shelf` | رف الإنجازات واللمسات النهائية | 60 | `item-12-achievement-shelf.png` | `stage-12-achievement-shelf.png` |

ملاحظة: `storeSlotKey` للسجادة يبقى `heartbeat_rug` عمدًا (ملكيات حالية). `itemKey` هو `doctor_heartbeat_rug`.

---

## شروط ظهور المرحلة للشراء

يجب تحقق الكل:

1. صورتان على القرص (بعد `sync:hq`)
2. سجل في الكتالوج المركزي
3. `StoreItem` نشط بالسعر الصحيح
4. المفتاح ضمن `StoreProgression` للمهنة
5. المرحلة السابقة مملوكة (اشتقاق من الملكيات)

---

## اقتصاد نقاط الدرس (مرجع سريع)

| نسبة أول محاولة | إتقان | مجموع (بدون ترحيب) |
|---|---:|---:|
| &lt; 60% | 0 | 5 |
| 60–79% | 1 | 6 |
| 80–99% | 2 | 7 |
| 100% | 3 | 8 |

+ نقطة ترحيب `1` مرة واحدة عند أول درس مكتمل في المنصة.

---

## استبدال صورة منشورة

استخدم `stage-02-doctor-desk-r2.png` وحدّث المسار في الكتالوج، أو أضف `?v=2`. لا تستخدم `final` / `final2`.

## الغرف المستقبلية

الحقل `roomNumber` موجود (العيادة الحالية = `1`). لا تنشئ محتوى الغرف 2–4 الآن.
