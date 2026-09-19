/**
 * Static HQ stage catalog (no asset-readiness imports).
 * Prices live in StoreItem; readiness comes from sync:hq.
 */

import { type ProfessionCode } from "@/lib/config/professions";

export const HQ_STAGE_WIDTH = 1024;
export const HQ_STAGE_HEIGHT = 682;
export const DOCTOR_ROOM_NUMBER = 1;

export type HeadquartersItemKey = string;

export type HeadquartersStageDefinition = {
  profession: ProfessionCode;
  roomNumber: number;
  stage: number;
  itemKey: HeadquartersItemKey | null;
  itemSlug: string | null;
  storeSlotKey: string | null;
  nameAr: string | null;
  descriptionAr: string | null;
  itemImage: string | null;
  stageImage: string;
  width: number;
  height: number;
};

function padStage(stage: number): string {
  return String(stage).padStart(2, "0");
}

export function stagePath(
  profession: ProfessionCode,
  stage: number,
  itemSlug: string | null
): string {
  const n = padStage(stage);
  if (stage === 0 || !itemSlug) {
    return `/images/headquarters/${profession}/stages/stage-${n}-empty.png`;
  }
  return `/images/headquarters/${profession}/stages/stage-${n}-${itemSlug}.png`;
}

export function itemPath(profession: ProfessionCode, stage: number, itemSlug: string): string {
  return `/images/headquarters/${profession}/items/item-${padStage(stage)}-${itemSlug}.png`;
}

export function makeItemKey(profession: ProfessionCode, itemSlug: string): HeadquartersItemKey {
  return `${profession}_${itemSlug.replace(/-/g, "_")}`;
}

function doctorStage(
  stage: number,
  itemSlug: string | null,
  storeSlotKey: string | null,
  nameAr: string | null,
  descriptionAr: string | null
): HeadquartersStageDefinition {
  return {
    profession: "doctor",
    roomNumber: DOCTOR_ROOM_NUMBER,
    stage,
    itemKey: itemSlug ? makeItemKey("doctor", itemSlug) : null,
    itemSlug,
    storeSlotKey,
    nameAr,
    descriptionAr,
    itemImage: itemSlug ? itemPath("doctor", stage, itemSlug) : null,
    stageImage: stagePath("doctor", stage, itemSlug),
    width: HQ_STAGE_WIDTH,
    height: HQ_STAGE_HEIGHT,
  };
}

export const DOCTOR_STAGES: HeadquartersStageDefinition[] = [
  doctorStage(0, null, null, null, null),
  doctorStage(
    1,
    "heartbeat-rug",
    "heartbeat_rug",
    "سجادة نبض القلب",
    "أضف لمسة طبية مميزة إلى أرضية عيادتك."
  ),
  doctorStage(2, "doctor-desk", "doctor_desk", "مكتب الطبيب", "أضف مكتبًا خاصًا لإدارة عيادتك."),
  doctorStage(3, "doctor-chair", "doctor_chair", "كرسي الطبيب", "اجلس مرتاحًا أثناء استقبال مرضاك."),
  doctorStage(
    4,
    "medical-tablet",
    "medical_tablet",
    "الجهاز اللوحي الطبي",
    "تابع ملفات المرضى بسهولة."
  ),
  doctorStage(5, "stethoscope", "stethoscope", "سماعة الطبيب", "أداة الفحص الأساسية لعيادتك."),
  doctorStage(
    6,
    "medicine-cabinet",
    "medicine_cabinet",
    "خزانة الأدوية",
    "نظم أدويتك في مكان آمن ومرتب."
  ),
  doctorStage(7, "exam-bed", "exam_bed", "سرير الفحص", "جهّز مكانًا مريحًا للفحص."),
  doctorStage(8, "exam-lamp", "exam_lamp", "مصباح الفحص", "أضئ منطقة الفحص بوضوح."),
  doctorStage(9, "microscope", "microscope", "المجهر", "استكشف التفاصيل الدقيقة."),
  doctorStage(
    10,
    "anatomy-model",
    "anatomy_model",
    "النموذج التشريحي",
    "تعلّم وتدرّب على بنية الجسم."
  ),
  doctorStage(
    11,
    "diagnostic-station",
    "diagnostic_station",
    "محطة القياس والتشخيص",
    "اجمع أدوات القياس في محطة واحدة."
  ),
  doctorStage(
    12,
    "achievement-shelf",
    "achievement_shelf",
    "رف الإنجازات واللمسات النهائية",
    "اعرض إنجازاتك وأكمل لمسات العيادة."
  ),
];

export const HEADQUARTERS_STAGES_BY_PROFESSION: Record<
  ProfessionCode,
  HeadquartersStageDefinition[]
> = {
  doctor: DOCTOR_STAGES,
  engineer: [],
  teacher: [],
  chef: [],
  astronaut: [],
  soldier: [],
};
