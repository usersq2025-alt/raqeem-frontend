"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { HqUpgradeConfirmModal } from "@/components/headquarters/HqUpgradeConfirmModal";
import { PointsPill } from "@/components/store/PointsPill";
import { Button } from "@/components/ui/Button";
import { useStudentChrome } from "@/components/StudentChrome";
import type { ChildProfile } from "@/lib/api/children";
import {
  getHeadquarters,
  getStoreItems,
  purchaseItem,
  StoreApiError,
  type HeadquartersSceneData,
  type StoreCatalog,
  type StoreCatalogItem,
} from "@/lib/api/store";
import {
  DOCTOR_HEARTBEAT_RUG_FALLBACK_PRICE,
  findStageByNumber,
  getStagesForProfession,
  getStorePathForProfession,
  resolveHeadquartersStage,
  type HeadquartersStageDefinition,
} from "@/lib/config/headquartersStages";
import {
  isProfessionCode,
  professionAvatarSrc,
  type ProfessionCode,
} from "@/lib/config/professions";
import { withChildQuery } from "@/lib/config/subjects";

type Props = {
  child: ChildProfile;
  scene: HeadquartersSceneData;
  catalog: StoreCatalog | null;
  fromBalance: number | null;
  welcome?: boolean;
};

type ViewPhase = "idle" | "celebrating" | "success";

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function stageAltKey(stage: number): "stage0Alt" | "stage1Alt" {
  return stage >= 1 ? "stage1Alt" : "stage0Alt";
}

function resolveProfession(child: ChildProfile, scene: HeadquartersSceneData): ProfessionCode {
  const code = child.professionCode ?? scene.professionCode;
  return isProfessionCode(code) ? code : "doctor";
}

function ownedKeysForProfession(
  items: HeadquartersSceneData["items"],
  profession: ProfessionCode
): string[] {
  const path = new Set(getStorePathForProfession(profession));
  return items
    .map((item) => item.slotKey)
    .filter((key): key is string => typeof key === "string" && key.length > 0 && path.has(key));
}

/** Staged HQ room experience — one cumulative stage image per profession path. */
export function DoctorHeadquartersExperience({
  child,
  scene,
  catalog,
  fromBalance,
  welcome = false,
}: Props) {
  const t = useTranslations("student.store");
  const tHq = useTranslations("student.hq");
  const tDev = useTranslations("student.hq.dev");
  const tCareer = useTranslations("career");
  const tBrand = useTranslations("student");
  const chrome = useStudentChrome();
  const setChromePoints = chrome?.setPoints;

  const profession = resolveProfession(child, scene);

  const [pointsBalance, setPointsBalance] = useState(scene.pointsBalance);
  const [ownedKeys, setOwnedKeys] = useState(() => ownedKeysForProfession(scene.items, profession));
  const [catalogItems, setCatalogItems] = useState(catalog?.items ?? []);
  const [catalogError, setCatalogError] = useState(catalog == null);
  const [displayStage, setDisplayStage] = useState(() =>
    resolveHeadquartersStage(ownedKeysForProfession(scene.items, profession), profession).currentStage
  );
  const [sceneSync, setSceneSync] = useState({ profession, items: scene.items });
  const [prevStageForFade, setPrevStageForFade] = useState<number | null>(null);
  const [phase, setPhase] = useState<ViewPhase>("idle");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [imageReady, setImageReady] = useState(false);
  const [stageImageBroken, setStageImageBroken] = useState(false);
  const [itemImageBroken, setItemImageBroken] = useState(false);
  const [trackedStageImage, setTrackedStageImage] = useState<string | null>(null);
  const [trackedItemImage, setTrackedItemImage] = useState<string | undefined | null>(null);
  const [lastPurchasedName, setLastPurchasedName] = useState("");
  const buyButtonRef = useRef<HTMLButtonElement>(null);
  const purchaseLock = useRef(false);

  const [catalogRevision, setCatalogRevision] = useState(0);

  if (profession !== sceneSync.profession || scene.items !== sceneSync.items) {
    const nextOwned = ownedKeysForProfession(scene.items, profession);
    setSceneSync({ profession, items: scene.items });
    setOwnedKeys(nextOwned);
    setDisplayStage(resolveHeadquartersStage(nextOwned, profession).currentStage);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { fetchHeadquartersCatalog } = await import("@/lib/api/headquartersCatalog");
      const remote = await fetchHeadquartersCatalog(profession);
      if (!cancelled && remote) setCatalogRevision((n) => n + 1);
    })();
    return () => {
      cancelled = true;
    };
  }, [profession]);

  const avatar = professionAvatarSrc(child.professionCode, child.gender) ?? "/images/brand/logo.png";
  const professionLabel =
    isProfessionCode(child.professionCode)
      ? tCareer(`presets.${child.professionCode}.${child.gender}`)
      : "";

  const allStages = useMemo(
    () => getStagesForProfession(profession),
    [profession, catalogRevision]
  );
  const resolved = useMemo(
    () => resolveHeadquartersStage(ownedKeys, profession),
    [ownedKeys, profession, catalogRevision]
  );
  const activeStageDef =
    findStageByNumber(profession, displayStage) ?? allStages[0] ?? resolved.stage;
  const fadeFromDef =
    prevStageForFade != null ? findStageByNumber(profession, prevStageForFade) : null;
  const nextStage = resolved.nextStage;

  const nextItem = useMemo(() => {
    const key = resolved.nextRequiredStoreSlotKey;
    if (!key) return null;
    return catalogItems.find((item) => item.slotKey === key) ?? null;
  }, [catalogItems, resolved.nextRequiredStoreSlotKey]);

  const nextPrice =
    nextItem?.pricePoints ??
    (profession === "doctor" && resolved.nextRequiredStoreSlotKey === "heartbeat_rug"
      ? DOCTOR_HEARTBEAT_RUG_FALLBACK_PRICE
      : null);

  const itemDisplayName = nextStage?.nameAr ?? nextItem?.name ?? "";
  const itemDescription = nextStage?.descriptionAr ?? "";
  const itemThumb =
    nextStage?.itemImage ?? nextItem?.imageUrl ?? "/images/brand/logo.png";

  const canAfford = nextPrice != null && pointsBalance >= nextPrice;
  const remainingPoints = nextPrice != null ? Math.max(0, nextPrice - pointsBalance) : 0;
  const showUpgrade =
    nextStage != null &&
    resolved.nextRequiredStoreSlotKey != null &&
    !ownedKeys.includes(resolved.nextRequiredStoreSlotKey) &&
    Boolean(nextStage.itemImage) &&
    !itemImageBroken;
  const showComingSoon = !showUpgrade && (resolved.nextStagePendingAssets || resolved.nextStage == null);

  useEffect(() => {
    setChromePoints?.(pointsBalance);
  }, [pointsBalance, setChromePoints]);

  if (trackedStageImage !== activeStageDef.stageImage) {
    if (trackedStageImage !== null) {
      setImageReady(false);
      setStageImageBroken(false);
    }
    setTrackedStageImage(activeStageDef.stageImage);
  }

  const nextItemImage = nextStage?.itemImage;
  if (trackedItemImage !== nextItemImage) {
    if (trackedItemImage !== null) {
      setItemImageBroken(false);
    }
    setTrackedItemImage(nextItemImage);
  }

  // Prefetch next cumulative stage image after current loads
  useEffect(() => {
    if (!nextStage?.stageImage || typeof window === "undefined") return;
    const img = new window.Image();
    img.src = nextStage.stageImage;
  }, [nextStage?.stageImage]);

  async function refreshFromServer() {
    try {
      const [freshHq, freshCatalog] = await Promise.all([
        getHeadquarters(child.id),
        getStoreItems(child.id),
      ]);
      setPointsBalance(freshHq.pointsBalance);
      setOwnedKeys(ownedKeysForProfession(freshHq.items, profession));
      setCatalogItems(freshCatalog.items);
      setCatalogError(false);
      const nextResolved = resolveHeadquartersStage(
        ownedKeysForProfession(freshHq.items, profession),
        profession
      );
      setDisplayStage(nextResolved.currentStage);
      return nextResolved;
    } catch {
      setCatalogError(true);
      return null;
    }
  }

  function openConfirm() {
    if (!showUpgrade || !canAfford || !nextItem || submitting || itemImageBroken) return;
    setPurchaseError(null);
    setConfirmOpen(true);
  }

  async function confirmPurchase() {
    if (!nextItem || purchaseLock.current || submitting || itemImageBroken) return;
    if (ownedKeys.includes(nextItem.slotKey ?? "")) {
      setConfirmOpen(false);
      setPurchaseError(t("alreadyOwned"));
      return;
    }
    if (nextPrice != null && pointsBalance < nextPrice) {
      setConfirmOpen(false);
      return;
    }

    purchaseLock.current = true;
    setSubmitting(true);
    setPurchaseError(null);

    try {
      const result = await purchaseItem(child.id, nextItem.id);
      const fromStage = displayStage;
      const purchasedName = itemDisplayName;
      const nextOwned = Array.from(
        new Set([...ownedKeys, result.slotKey ?? nextItem.slotKey ?? ""].filter(Boolean))
      );
      const nextResolved = resolveHeadquartersStage(nextOwned, profession);

      setPointsBalance(result.pointsBalance);
      setOwnedKeys(nextOwned);
      setLastPurchasedName(purchasedName);
      setCatalogItems((prev) =>
        prev.map((item) => (item.id === nextItem.id ? { ...item, canPurchase: false } : item))
      );
      setConfirmOpen(false);

      if (prefersReducedMotion()) {
        setDisplayStage(nextResolved.currentStage);
        setPhase("success");
      } else {
        setPrevStageForFade(fromStage);
        setDisplayStage(nextResolved.currentStage);
        setPhase("celebrating");
        window.setTimeout(() => {
          setPrevStageForFade(null);
          setPhase("success");
        }, 520);
      }
    } catch (caught) {
      const status = caught instanceof StoreApiError ? caught.status : 500;
      setPurchaseError(status === 409 ? t("alreadyOwned") : t("purchaseFailed"));
      setConfirmOpen(false);
      await refreshFromServer();
    } finally {
      setSubmitting(false);
      purchaseLock.current = false;
    }
  }

  return (
    <div className="md:grid md:grid-cols-[minmax(0,1fr)_22rem] md:items-start md:gap-7">
      <h1 className="sr-only md:hidden">{tDev("clinicTitle")}</h1>

      <div>
        {welcome ? (
          <section className="mb-5 rounded-[28px] bg-white p-5 text-center shadow-[0_16px_36px_-24px_rgba(26,43,71,0.4)] md:text-start">
            <h1 className="text-2xl font-extrabold text-text-navy">{tHq("welcomeTitle")}</h1>
            <p className="mt-2 text-sm font-bold leading-relaxed text-text-gray">
              {tHq("welcomeBody", {
                name: child.fullName,
                profession: professionLabel || child.fullName,
              })}
            </p>
          </section>
        ) : null}

        <header dir="ltr" className="mb-4 flex items-center justify-between gap-3 md:hidden">
          <Image
            src="/images/brand/logo.png"
            alt={tBrand("brandAlt")}
            width={1012}
            height={551}
            className="h-11 w-auto object-contain"
            priority
          />
          <div className="flex items-center gap-2">
            <span aria-live="polite">
              <PointsPill count={pointsBalance} from={fromBalance} label={t("pointsUnit")} />
            </span>
            <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_8px_18px_-12px_rgba(26,43,71,0.5)]">
              <Image
                src={avatar}
                alt={child.fullName}
                width={120}
                height={120}
                unoptimized
                className="h-[88%] w-[88%] object-contain"
              />
            </span>
          </div>
        </header>

        <section className="mb-4 rounded-[24px] bg-white/90 px-4 py-3 shadow-[0_12px_28px_-22px_rgba(26,43,71,0.35)] md:hidden">
          <HqStatusBar
            title={tDev("clinicTitle")}
            stageLabel={tDev("stageLabel", { stage: resolved.currentStage })}
            points={pointsBalance}
            pointsUnit={t("pointsUnit")}
            progress={tDev("progress", {
              current: resolved.progressLabel.current,
              total: resolved.progressLabel.total,
            })}
          />
        </section>

        {stageImageBroken ? (
          <p className="mb-3 rounded-2xl bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#B42318]" role="alert">
            تعذّر عرض المقر حاليًا. حاول تحديث الصفحة.
          </p>
        ) : null}

        <DoctorStageViewport
          stage={activeStageDef}
          fadeFrom={fadeFromDef}
          celebrating={phase === "celebrating"}
          imageReady={imageReady}
          onImageReady={() => setImageReady(true)}
          onImageError={() => {
            if (process.env.NODE_ENV === "development") {
              console.error(
                `[HQ] Missing stage image for stage ${activeStageDef.stage}: ${activeStageDef.stageImage}`
              );
            }
            setStageImageBroken(true);
          }}
          alt={tDev(stageAltKey(activeStageDef.stage))}
          fadeAlt={fadeFromDef ? tDev(stageAltKey(fadeFromDef.stage)) : ""}
        />

        <div className="mt-5 md:hidden">
          <UpgradePanel
            showUpgrade={showUpgrade}
            showComingSoon={showComingSoon}
            nextItem={nextItem}
            nextPrice={nextPrice}
            itemDisplayName={itemDisplayName}
            itemDescription={itemDescription}
            itemThumb={itemThumb}
            pointsBalance={pointsBalance}
            canAfford={canAfford}
            remainingPoints={remainingPoints}
            catalogError={catalogError}
            purchaseError={purchaseError}
            submitting={submitting}
            ownedBadge={resolved.currentStage >= 1 && !showUpgrade && !resolved.nextStagePendingAssets}
            buyButtonRef={buyButtonRef}
            onBuy={openConfirm}
            onRetry={() => void refreshFromServer()}
            onItemImageError={() => {
              if (process.env.NODE_ENV === "development") {
                console.error(`[HQ] Missing item image: ${itemThumb}`);
              }
              setItemImageBroken(true);
            }}
            childId={child.id}
          />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5 md:hidden">
          <Button
            href={withChildQuery("/subjects", child.id)}
            variant="secondary"
            fullWidth
            className="!min-h-11 !min-w-0 text-[13px] sm:text-base"
          >
            {t("backToLearning")}
          </Button>
          <Button
            href={withChildQuery("/store", child.id)}
            variant="secondary"
            fullWidth
            className="!min-h-11 !min-w-0 text-[13px] sm:text-base"
          >
            {t("continueShopping")}
          </Button>
        </div>
      </div>

      <aside className="mt-5 hidden flex-col gap-4 md:mt-0 md:flex">
        <section className="rounded-[28px] bg-white p-5 shadow-[0_16px_36px_-24px_rgba(26,43,71,0.4)]">
          <div className="flex items-center gap-3">
            <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#FFF8F1]">
              <Image
                src={avatar}
                alt={child.fullName}
                width={120}
                height={120}
                unoptimized
                className="h-[88%] w-[88%] object-contain"
              />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-text-navy">{child.fullName}</p>
              <div className="mt-1" aria-live="polite">
                <PointsPill count={pointsBalance} from={fromBalance} label={t("pointsUnit")} />
              </div>
            </div>
          </div>
          <div className="mt-4">
            <HqStatusBar
              title={tDev("clinicTitle")}
              stageLabel={tDev("stageLabel", { stage: resolved.currentStage })}
              points={pointsBalance}
              pointsUnit={t("pointsUnit")}
              progress={tDev("progress", {
                current: resolved.progressLabel.current,
                total: resolved.progressLabel.total,
              })}
              compact
            />
          </div>
        </section>

        <UpgradePanel
          showUpgrade={showUpgrade}
          showComingSoon={showComingSoon}
          nextItem={nextItem}
          nextPrice={nextPrice}
          itemDisplayName={itemDisplayName}
          itemDescription={itemDescription}
          itemThumb={itemThumb}
          pointsBalance={pointsBalance}
          canAfford={canAfford}
          remainingPoints={remainingPoints}
          catalogError={catalogError}
          purchaseError={purchaseError}
          submitting={submitting}
          ownedBadge={resolved.currentStage >= 1 && !showUpgrade && !resolved.nextStagePendingAssets}
          buyButtonRef={buyButtonRef}
          onBuy={openConfirm}
          onRetry={() => void refreshFromServer()}
          onItemImageError={() => {
            if (process.env.NODE_ENV === "development") {
              console.error(`[HQ] Missing item image: ${itemThumb}`);
            }
            setItemImageBroken(true);
          }}
          childId={child.id}
        />

        <div className="flex flex-col gap-2.5">
          <Button
            href={withChildQuery("/subjects", child.id)}
            variant="secondary"
            fullWidth
            className="!min-h-11 !min-w-0"
          >
            {t("backToLearning")}
          </Button>
          <Button
            href={withChildQuery("/store", child.id)}
            variant="secondary"
            fullWidth
            className="!min-h-11 !min-w-0"
          >
            {t("continueShopping")}
          </Button>
        </div>
      </aside>

      <HqUpgradeConfirmModal
        open={confirmOpen}
        itemName={itemDisplayName}
        price={nextPrice ?? 0}
        submitting={submitting}
        onConfirm={() => void confirmPurchase()}
        onCancel={() => {
          if (!submitting) setConfirmOpen(false);
        }}
        returnFocusRef={buyButtonRef}
      />

      {phase === "success" ? (
        <SuccessOverlay
          title={tDev("successTitle")}
          body={tDev("successBody", {
            item: lastPurchasedName || itemDisplayName || tDev("items.heartbeat_rug"),
          })}
          action={tDev("successAction")}
          onClose={() => setPhase("idle")}
        />
      ) : null}
    </div>
  );
}

function HqStatusBar({
  title,
  stageLabel,
  points,
  pointsUnit,
  progress,
  compact = false,
}: {
  title: string;
  stageLabel: string;
  points: number;
  pointsUnit: string;
  progress: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-1.5" : "space-y-1"}>
      <h2 className="text-xl font-extrabold text-text-navy md:text-2xl">{title}</h2>
      <p className="text-sm font-extrabold text-primary-orange">{stageLabel}</p>
      {!compact ? (
        <p className="text-sm font-bold text-text-gray" aria-live="polite">
          {pointsUnit}: {points}
        </p>
      ) : null}
      <p className="text-xs font-bold text-text-gray">{progress}</p>
    </div>
  );
}

function DoctorStageViewport({
  stage,
  fadeFrom,
  celebrating,
  imageReady,
  onImageReady,
  onImageError,
  alt,
  fadeAlt,
}: {
  stage: HeadquartersStageDefinition;
  fadeFrom: HeadquartersStageDefinition | null;
  celebrating: boolean;
  imageReady: boolean;
  onImageReady: () => void;
  onImageError: () => void;
  alt: string;
  fadeAlt: string;
}) {
  return (
    <div
      className={`hq-stage-card relative overflow-hidden rounded-[28px] bg-[#F7F0E6] p-2 shadow-[0_24px_40px_-22px_rgba(26,43,71,0.48)] sm:p-3 ${
        celebrating ? "hq-stage-celebrate" : ""
      }`}
    >
      <div
        className="relative w-full overflow-hidden rounded-[22px] bg-[#EDE4D6]"
        style={{ aspectRatio: `${stage.width} / ${stage.height}` }}
      >
        {!imageReady ? <div className="hq-stage-skeleton absolute inset-0" aria-hidden="true" /> : null}

        {fadeFrom ? (
          <Image
            src={fadeFrom.stageImage}
            alt={fadeAlt}
            width={fadeFrom.width}
            height={fadeFrom.height}
            className="hq-stage-fade-out absolute inset-0 h-full w-full object-contain"
            sizes="(max-width: 768px) 100vw, 70vw"
            priority
            unoptimized={/^https?:\/\//.test(fadeFrom.stageImage)}
          />
        ) : null}

        <Image
          key={stage.stageImage}
          src={stage.stageImage}
          alt={alt}
          width={stage.width}
          height={stage.height}
          className={`relative h-full w-full object-contain ${fadeFrom ? "hq-stage-fade-in" : ""}`}
          sizes="(max-width: 768px) 100vw, 70vw"
          priority
          unoptimized={/^https?:\/\//.test(stage.stageImage)}
          onLoad={onImageReady}
          onError={onImageError}
        />

        {celebrating ? (
          <div className="hq-stage-sparks pointer-events-none absolute inset-0" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function UpgradePanel({
  showUpgrade,
  showComingSoon,
  nextItem,
  nextPrice,
  itemDisplayName,
  itemDescription,
  itemThumb,
  pointsBalance,
  canAfford,
  remainingPoints,
  catalogError,
  purchaseError,
  submitting,
  ownedBadge,
  buyButtonRef,
  onBuy,
  onRetry,
  onItemImageError,
  childId,
}: {
  showUpgrade: boolean;
  showComingSoon: boolean;
  nextItem: StoreCatalogItem | null;
  nextPrice: number | null;
  itemDisplayName: string;
  itemDescription: string;
  itemThumb: string;
  pointsBalance: number;
  canAfford: boolean;
  remainingPoints: number;
  catalogError: boolean;
  purchaseError: string | null;
  submitting: boolean;
  ownedBadge: boolean;
  buyButtonRef: React.RefObject<HTMLButtonElement | null>;
  onBuy: () => void;
  onRetry: () => void;
  onItemImageError: () => void;
  childId: number;
}) {
  const tDev = useTranslations("student.hq.dev");

  if (!showUpgrade) {
    return (
      <section className="rounded-[28px] bg-white p-5 shadow-[0_16px_36px_-24px_rgba(26,43,71,0.4)]">
        <h2 className="text-sm font-extrabold text-text-navy">{tDev("nextUpgrade")}</h2>
        {ownedBadge ? (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#E8F7EE] px-3 py-1 text-xs font-extrabold text-[#1B7A45]">
            <span aria-hidden="true">✓</span>
            {tDev("addedBadge")}
          </p>
        ) : null}
        {showComingSoon || ownedBadge ? (
          <p className="mt-3 text-sm font-bold leading-relaxed text-text-gray">{tDev("comingSoon")}</p>
        ) : null}
      </section>
    );
  }

  const buyDisabled = !canAfford || !nextItem || submitting || catalogError;

  return (
    <section className="rounded-[28px] bg-white p-5 shadow-[0_16px_36px_-24px_rgba(26,43,71,0.4)]">
      <p className="text-xs font-extrabold text-primary-orange">{tDev("devLabel")}</p>
      <h2 className="mt-1 text-xl font-extrabold text-text-navy">{tDev("startTitle")}</h2>
      <p className="mt-2 text-sm font-bold leading-relaxed text-text-gray">{tDev("startBody")}</p>

      <div className="mt-4 rounded-[22px] bg-[#FFF8F1] p-4">
        <p className="text-xs font-extrabold text-text-gray">{tDev("nextUpgrade")}</p>
        <div className="mt-3 flex gap-3">
          <span className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-[#F0E4D4]">
            <Image
              src={itemThumb}
              alt=""
              width={316}
              height={315}
              unoptimized
              className="h-[88%] w-[88%] object-contain"
              onError={onItemImageError}
            />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-extrabold text-text-navy">{itemDisplayName}</h3>
            {itemDescription ? (
              <p className="mt-1 text-sm font-semibold leading-snug text-text-gray">{itemDescription}</p>
            ) : null}
            <p className="mt-2 text-sm font-extrabold text-primary-orange">
              {nextPrice != null ? tDev("price", { count: nextPrice }) : "—"}
            </p>
          </div>
        </div>

        {nextPrice != null ? (
          <div className="mt-3" role="status">
            <div className="h-2.5 overflow-hidden rounded-full bg-[#F0E4D4]">
              <div
                className="h-full rounded-full bg-primary-orange transition-[width] duration-300"
                style={{
                  width: `${Math.min(100, Math.round((pointsBalance / nextPrice) * 100))}%`,
                }}
              />
            </div>
            <p className="mt-1.5 text-xs font-bold text-text-gray">
              {tDev("balanceProgress", { balance: pointsBalance, price: nextPrice })}
            </p>
          </div>
        ) : null}

        {catalogError ? (
          <div className="mt-3 rounded-2xl bg-[#FFF1F0] px-3 py-2 text-sm font-bold text-[#B42318]" role="alert">
            <p>{tDev("balanceLoadError")}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 inline-flex min-h-11 items-center rounded-full bg-white px-4 text-sm font-extrabold text-text-navy"
            >
              {tDev("retry")}
            </button>
          </div>
        ) : null}

        {purchaseError ? (
          <p className="mt-3 text-sm font-bold text-[#B42318]" role="alert">
            {purchaseError}
          </p>
        ) : null}

        {canAfford ? (
          <p className="mt-3 text-sm font-extrabold text-[#1B7A45]" role="status">
            {tDev("readyToAdd")}
          </p>
        ) : nextPrice != null ? (
          <div className="mt-3 space-y-2" role="status">
            <p className="text-sm font-extrabold text-text-navy">
              {tDev("needMorePoints", { remainingPoints, item: itemDisplayName })}
            </p>
            <Button
              href={withChildQuery("/subjects", childId)}
              variant="secondary"
              fullWidth
              className="!min-h-11 !min-w-0"
            >
              {tDev("earnPointsCta")}
            </Button>
          </div>
        ) : null}

        <button
          ref={buyButtonRef}
          type="button"
          disabled={buyDisabled}
          onClick={onBuy}
          className="btn-sticker mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2.5 rounded-full bg-primary-orange px-6 py-3.5 text-base font-bold text-white disabled:pointer-events-none disabled:opacity-45"
        >
          {submitting ? <span className="otp-spinner" aria-hidden="true" /> : null}
          {tDev("buyAndAdd")}
        </button>
      </div>
    </section>
  );
}

function SuccessOverlay({
  title,
  body,
  action,
  onClose,
}: {
  title: string;
  body: string;
  action: string;
  onClose: () => void;
}) {
  const titleId = "hq-success-title";
  const panelRef = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    panelRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="purchase-modal-backdrop fixed inset-0 z-[75] flex items-end justify-center bg-[#1A2B47]/45 px-4 pb-8 pt-10 sm:items-center sm:pb-10">
      <div
        ref={panelRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-live="polite"
        className="purchase-modal-panel w-full max-w-sm rounded-[28px] bg-white px-5 pb-5 pt-6 outline-none shadow-[0_24px_50px_-24px_rgba(26,43,71,0.55)]"
      >
        <h2 id={titleId} className="text-center text-xl font-extrabold text-text-navy">
          {title}
        </h2>
        <p className="mt-3 text-center text-sm font-bold leading-relaxed text-text-gray">{body}</p>
        <Button type="button" fullWidth className="mt-5 !min-h-11" onClick={onClose}>
          {action}
        </Button>
      </div>
    </div>,
    document.body
  );
}
