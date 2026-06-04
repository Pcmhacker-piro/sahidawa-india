"use client";

import { PageHeader } from "../components/PageHeader";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { vaccineDatabase, VaccineKey, VACCINE_GLOBAL_DISCLAIMER } from "@/lib/vaccineData";
import {
    Syringe,
    Calendar,
    ShieldAlert,
    HeartPulse,
    Target,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    ChevronDown,
    Search,
} from "lucide-react";

export default function VaccineHubPage() {
    const t = useTranslations("vaccineHub");
    const [selectedVaccine, setSelectedVaccine] = useState<VaccineKey | "">("");
    const [initialDate, setInitialDate] = useState<string>("");

    const vaccine = selectedVaccine ? vaccineDatabase[selectedVaccine] : null;

    // Safely converts tracking week offsets into an absolute calendar string representation
    const calculateMilestoneDate = (weeksOffset: number) => {
        if (!initialDate) return null;

        const reference = new Date(initialDate);
        if (isNaN(reference.getTime())) return null; // Edge-case syntax protection fallback

        const targetDate = new Date(reference.getTime());
        targetDate.setDate(targetDate.getDate() + weeksOffset * 7);

        return targetDate.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    return (
        <>
            <PageHeader
                title={t("pageHeaderTitle")}
                subtitle={t("pageHeaderSubtitle")}
                backHref="/"
                variant="light"
            />
            <div className="min-h-screen bg-(--color-surface-muted) p-6 text-(--color-text-primary) transition-colors duration-200 md:p-10">
                {/* HEADER */}
                <div className="mx-auto mb-8 max-w-5xl border-b border-(--color-border-muted) pb-5">
                    <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight text-emerald-600">
                        <Syringe className="h-7 w-7 shrink-0 text-emerald-600" /> {t("title")}
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-(--color-text-secondary)">
                        {t("subtitle")}
                    </p>
                </div>

                {/* CONTROLS AREA (Dropdown + Optional Dynamic Date Tracker Grid) */}
                <div className="mx-auto mb-8 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
                    {/* SELECT DROPDOWN */}
                    <div>
                        <label className="mb-2 block text-xs font-bold tracking-wider text-emerald-800 uppercase">
                            {t("selectLabel")}
                        </label>
                        <div className="relative">
                            <select
                                className="w-full cursor-pointer appearance-none rounded-xl border-2 border-(--color-border-muted) bg-(--color-surface-page) py-3 pr-4 pl-10 font-medium text-(--color-text-primary) shadow-sm transition-all duration-200 hover:border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                                value={selectedVaccine}
                                onChange={(e) => {
                                    setSelectedVaccine(e.target.value as VaccineKey);
                                    setInitialDate("");
                                }}
                            >
                                <option value="">{t("placeholder")}</option>
                                {(Object.keys(vaccineDatabase) as VaccineKey[]).map((key) => (
                                    <option key={key} value={key}>
                                        {vaccineDatabase[key].disease_name}
                                    </option>
                                ))}
                            </select>
                            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-(--color-text-secondary)" />
                            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-(--color-text-secondary)" />
                        </div>
                    </div>

                    {/* TIME GENERATOR CONTROL */}
                    {vaccine && (
                        <div>
                            <label className="mb-2 block text-xs font-bold tracking-wider text-emerald-800 uppercase">
                                {vaccine.is_relative_to_birth
                                    ? t("childBirthDate")
                                    : t("milestoneBaseDate")}
                            </label>
                            <input
                                type="date"
                                className="w-full rounded-lg border border-(--color-border-muted) bg-(--color-surface-page) p-3 font-medium text-(--color-text-primary) shadow-sm outline-none focus:ring-2 focus:ring-emerald-500"
                                value={initialDate}
                                onChange={(e) => setInitialDate(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                {/* EMPTY STATE */}
                {!vaccine && (
                    <div className="mx-auto max-w-2xl rounded-2xl border border-(--color-border-muted) bg-(--color-surface-page) px-8 py-14 text-center shadow-sm">
                        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 ring-1 ring-emerald-200">
                            <Calendar className="h-6 w-6 text-emerald-700" />
                        </div>
                        <p className="text-xl font-bold text-(--color-text-primary)">
                            {t("noVaccineSelected")}
                        </p>
                        <p className="mt-1 text-sm text-(--color-text-secondary)">
                            {t("chooseVaccinePrompt")}
                        </p>
                        <ul className="mx-auto mt-4 max-w-sm space-y-2.5 rounded-lg border border-(--color-border-muted) bg-(--color-surface-muted) p-4 text-left">
                            <li className="flex items-center gap-3 text-sm text-(--color-text-secondary)">
                                <Calendar className="h-4 w-4 shrink-0 text-emerald-500" />
                                {t("featureSchedule")}
                            </li>
                            <li className="flex items-center gap-3 text-sm text-(--color-text-secondary)">
                                <ShieldAlert className="h-4 w-4 shrink-0 text-amber-500" />
                                {t("featureSideEffects")}
                            </li>
                            <li className="flex items-center gap-3 text-sm text-(--color-text-secondary)">
                                <HeartPulse className="h-4 w-4 shrink-0 text-sky-500" />
                                {t("featureAftercare")}
                            </li>
                        </ul>
                    </div>
                )}

                {/* MAIN CONTENT CANVAS */}
                {vaccine && (
                    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-3">
                        {/* LEFT COLUMN: VACCINE DETAILS METADATA */}
                        <div className="flex h-fit flex-col justify-between rounded-xl border border-(--color-border-muted) bg-(--color-surface-page) p-6 shadow-sm lg:sticky lg:top-6">
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight text-(--color-text-primary)">
                                    {vaccine.disease_name}
                                </h2>
                                <span className="mt-2 inline-block rounded-md border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
                                    {vaccine.vaccine_name}
                                </span>

                                <div className="mt-5 space-y-3 border-t border-(--color-border-muted) pt-4 text-sm text-(--color-text-secondary)">
                                    <p>
                                        <b className="font-semibold text-(--color-text-primary)">
                                            {t("targetGroups")}:
                                        </b>{" "}
                                        {vaccine.target_groups.join(", ")}
                                    </p>
                                    <p>
                                        <b className="font-semibold text-(--color-text-primary)">
                                            {t("totalDoses")}:
                                        </b>{" "}
                                        {vaccine.total_doses}
                                    </p>
                                    <p>
                                        <b className="font-semibold text-(--color-text-primary)">
                                            {t("effectiveness")}:
                                        </b>{" "}
                                        {vaccine.effectiveness}
                                    </p>
                                    <p>
                                        <b className="font-semibold text-(--color-text-primary)">
                                            {t("classification")}:
                                        </b>{" "}
                                        {vaccine.category}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 rounded-lg border border-t border-(--color-border-muted) bg-slate-50 p-3 pt-4 text-xs leading-relaxed text-(--color-text-secondary)">
                                <span className="mb-1 block font-bold text-(--color-text-secondary) not-italic dark:text-gray-900">
                                    {t("aboutDisease")}
                                </span>
                                <span className="italic dark:text-gray-900">
                                    {vaccine.disease_summary}
                                </span>
                            </div>
                        </div>

                        {/* MIDDLE & RIGHT COMBINED COLUMN: TIMELINE, SYMPTOMS & SAFETY INSIGHTS */}
                        <div className="space-y-6 lg:col-span-2">
                            <h3 className="flex items-center gap-2 text-lg font-bold text-(--color-text-primary)">
                                <Calendar className="h-5 w-5 text-emerald-600" />{" "}
                                {t("scheduleLayoutHeading")}
                            </h3>

                            {/* GENERATED DOSES RENDER LOOP */}
                            <div className="space-y-3">
                                {(vaccine.dosing_intervals_weeks || []).map((weeks, index) => {
                                    const dateString = calculateMilestoneDate(weeks);

                                    let labelHeader = "";
                                    if (vaccine.is_relative_to_birth) {
                                        labelHeader =
                                            weeks === 0 ? t("atBirth") : t("atWeeks", { weeks });
                                    } else {
                                        labelHeader =
                                            index === 0
                                                ? t("baseline")
                                                : t("doseStep", { index: index + 1, weeks });
                                    }

                                    return (
                                        <div
                                            key={index}
                                            className="flex cursor-default items-center gap-4 rounded-xl border border-(--color-border-muted) bg-(--color-surface-page) p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
                                        >
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white shadow-sm ring-2 ring-emerald-100">
                                                {index + 1}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold text-(--color-text-primary) sm:text-base">
                                                    {labelHeader}
                                                </p>
                                                {dateString ? (
                                                    <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 sm:text-sm">
                                                        <Target className="h-3.5 w-3.5 shrink-0" />
                                                        {t("targetDate", { date: dateString })}
                                                    </span>
                                                ) : (
                                                    <span className="mt-1 flex w-fit items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                                                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                                        {t("selectDateWarning")}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* SIDE EFFECTS CONDITIONAL ARRAYS GRID */}
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
                                <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/40 p-4">
                                    <h4 className="flex items-center gap-2 text-sm font-bold tracking-wide text-emerald-800 uppercase">
                                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />{" "}
                                        {t("commonEffects")}
                                    </h4>
                                    <ul className="mt-2.5 ml-5 list-disc space-y-1.5 text-xs font-medium text-amber-950 sm:text-sm">
                                        {vaccine.side_effects.common.map((effect, index) => (
                                            <li key={index}>{effect}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="rounded-xl border border-rose-200/60 bg-rose-50/60 p-4">
                                    <h4 className="flex items-center gap-2 text-sm font-bold tracking-wide text-rose-800 uppercase">
                                        <XCircle className="h-4 w-4 shrink-0 text-rose-600" />{" "}
                                        {t("severeReactions")}
                                    </h4>
                                    <ul className="mt-2.5 ml-5 list-disc space-y-1.5 text-xs font-medium text-rose-950 sm:text-sm">
                                        {vaccine.side_effects.severe.map((effect, index) => (
                                            <li key={index}>{effect}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* AFTERCARE DATA FRAME */}
                            <div className="rounded-xl border border-sky-200/60 bg-sky-50 p-4">
                                <h4 className="flex items-center gap-2 text-sm font-bold tracking-wide text-sky-800 uppercase">
                                    <HeartPulse className="h-4 w-4 shrink-0 text-sky-600" />{" "}
                                    {t("aftercareHeading")}
                                </h4>
                                <p className="mt-2 text-xs leading-relaxed font-medium text-sky-950 sm:text-sm">
                                    {vaccine.aftercare_text}
                                </p>
                            </div>

                            {/* SYSTEM LEGAL DISCLAIMER FOOTER COMPONENT */}
                            <p className="mt-6 block border-t border-(--color-border-muted) pt-4 text-center text-[11px] leading-normal text-(--color-text-secondary) italic">
                                {VACCINE_GLOBAL_DISCLAIMER}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
