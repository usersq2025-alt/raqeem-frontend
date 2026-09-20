"use client";

import { DoctorHeadquartersExperience } from "@/components/headquarters/DoctorHeadquartersExperience";
import type { ChildProfile } from "@/lib/api/children";
import type { HeadquartersSceneData, StoreCatalog } from "@/lib/api/store";
import { isProfessionCode } from "@/lib/config/professions";

type Props = {
  child: ChildProfile;
  scene: HeadquartersSceneData;
  catalog?: StoreCatalog | null;
  highlightId: number | null;
  fromBalance: number | null;
  welcome?: boolean;
};

/**
 * مقر المهنة التراكمي (صور مراحل) لكل المهن — لم يعد يعتمد واجهة العيادة القديمة.
 */
export function HeadquartersExperience({
  child,
  scene,
  catalog = null,
  fromBalance,
  welcome = false,
}: Props) {
  const code = child.professionCode ?? scene.professionCode;
  if (!isProfessionCode(code)) {
    return (
      <p className="rounded-[28px] bg-white p-6 text-center text-sm font-bold text-text-gray">
        اختر مهنة أولًا لعرض المقر.
      </p>
    );
  }

  return (
    <DoctorHeadquartersExperience
      child={child}
      scene={scene}
      catalog={catalog}
      fromBalance={fromBalance}
      welcome={welcome}
    />
  );
}
