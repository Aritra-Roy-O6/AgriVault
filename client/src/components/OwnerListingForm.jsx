import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getCategoryLabel, supportedStorageCategories } from "../storageMath";
import { environmentTagOptions } from "../storageRules";

const SECTION_IDS = ["details", "capacity", "requirements", "location"];

const SPACE_TYPE_OPTIONS = [
  { value: "spare room", key: "spareRoom" },
  { value: "garage", key: "garage" },
  { value: "shop basement", key: "shopBasement" },
  { value: "godown", key: "godown" },
  { value: "warehouse bay", key: "warehouseBay" },
];

const PRICING_UNIT_OPTIONS = [
  { value: "daily", key: "daily" },
  { value: "weekly", key: "weekly" },
  { value: "monthly", key: "monthly" },
];

function getSectionStatus(sectionId, form, geotagMode) {
  if (sectionId === "details") {
    return Boolean(form.name && form.address && form.pincode && form.spaceType);
  }
  if (sectionId === "capacity") {
    return Boolean(form.totalSqft && form.availableSqft && form.heightFt && form.pricePerSqft && form.pricingUnit);
  }
  if (sectionId === "requirements") {
    return form.supportedCategories.length > 0 && form.environmentTags.length > 0;
  }
  if (sectionId === "location") {
    return geotagMode === "auto" || Boolean(form.lat && form.lng);
  }
  return false;
}

export default function OwnerListingForm({
  form,
  saving,
  updateForm,
  toggleMultiSelect,
  handleAddWarehouse,
  locationImagePreview,
  locationImageRef,
  handleLocationImage,
  geotagLoading,
  geotagMessage,
  geotagMode,
}) {
  const { t } = useTranslation("owner");
  const [activeSection, setActiveSection] = useState("details");

  const sectionMeta = useMemo(
    () => SECTION_IDS.map((id) => ({
      id,
      label: t(`form.sections.${id}`),
      complete: getSectionStatus(id, form, geotagMode),
    })),
    [form, geotagMode, t]
  );

  const activeIndex = SECTION_IDS.indexOf(activeSection);
  const canGoBack = activeIndex > 0;
  const canGoForward = activeIndex < SECTION_IDS.length - 1;

  const goToNext = () => {
    if (!canGoForward) return;
    setActiveSection(SECTION_IDS[activeIndex + 1]);
  };

  const goToPrevious = () => {
    if (!canGoBack) return;
    setActiveSection(SECTION_IDS[activeIndex - 1]);
  };

  return (
    <div className="card card-compact owner-form-shell">
      <div className="owner-form-header">
        <div>
          <p className="eyebrow">{t("form.eyebrow")}</p>
          <h3 style={{ marginBottom: "0.45rem" }}>{t("form.title")}</h3>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>{t("form.subtitle")}</p>
        </div>
        <div className="tab-strip owner-form-steps">
          {sectionMeta.map((section, index) => (
            <button
              className={`inner-tab owner-step-tab${activeSection === section.id ? " active" : ""}`}
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              type="button"
            >
              <span>{index + 1}. {section.label}</span>
              {section.complete ? <span className="owner-step-dot">{t("form.stepDone")}</span> : null}
            </button>
          ))}
        </div>
      </div>

      <form className="form-grid owner-form-grid" onSubmit={handleAddWarehouse}>
        {activeSection === "details" ? (
          <div className="owner-form-section-grid">
            <label>
              {t("form.fields.spaceName")}
              <input name="name" onChange={updateForm} placeholder={t("form.placeholders.spaceName")} required value={form.name} />
            </label>
            <label>
              {t("form.fields.fullAddress")}
              <input name="address" onChange={updateForm} placeholder={t("form.placeholders.fullAddress")} required value={form.address} />
            </label>
            <div className="form-row">
              <label>
                {t("form.fields.pincode")}
                <input name="pincode" onChange={updateForm} placeholder={t("form.placeholders.pincode")} required value={form.pincode} />
              </label>
              <label>
                {t("form.fields.spaceType")}
                <select name="spaceType" onChange={updateForm} value={form.spaceType}>
                  {SPACE_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{t(`form.spaceTypeOptions.${option.key}`)}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ) : null}

        {activeSection === "capacity" ? (
          <div className="owner-form-section-grid">
            <div className="form-row">
              <label>
                {t("form.fields.totalSqft")}
                <input name="totalSqft" onChange={updateForm} placeholder={t("form.placeholders.totalSqft")} required type="number" value={form.totalSqft} />
              </label>
              <label>
                {t("form.fields.availableSqft")}
                <input name="availableSqft" onChange={updateForm} placeholder={t("form.placeholders.availableSqft")} required type="number" value={form.availableSqft} />
              </label>
            </div>
            <div className="form-row">
              <label>
                {t("form.fields.heightFt")}
                <input name="heightFt" onChange={updateForm} placeholder={t("form.placeholders.heightFt")} required step="0.1" type="number" value={form.heightFt} />
              </label>
              <label>
                {t("form.fields.pricePerSqft")}
                <input name="pricePerSqft" onChange={updateForm} placeholder={t("form.placeholders.pricePerSqft")} required step="0.1" type="number" value={form.pricePerSqft} />
              </label>
            </div>
            <label>
              {t("form.fields.pricingUnit")}
              <select name="pricingUnit" onChange={updateForm} value={form.pricingUnit}>
                {PRICING_UNIT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{t(`form.pricingUnitOptions.${option.key}`)}</option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        {activeSection === "requirements" ? (
          <div className="owner-form-section-grid">
            <fieldset className="field option-fieldset">
              <legend>{t("form.fields.supportedCategories")}</legend>
              <p className="field-hint">{t("form.hints.supportedCategories")}</p>
              <div className="option-grid owner-option-grid">
                {supportedStorageCategories.map((category) => (
                  <label className={`checkbox-item option-card filter-option-card${form.supportedCategories.includes(category) ? " active" : ""}`} key={category}>
                    <input
                      checked={form.supportedCategories.includes(category)}
                      onChange={() => toggleMultiSelect("supportedCategories", category)}
                      type="checkbox"
                    />
                    <span>{getCategoryLabel(category)}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="field option-fieldset">
              <legend>{t("form.fields.environmentTags")}</legend>
              <p className="field-hint">{t("form.hints.environmentTags")}</p>
              <div className="option-grid owner-option-grid">
                {environmentTagOptions.map((option) => (
                  <label className={`checkbox-item option-card filter-option-card${form.environmentTags.includes(option.value) ? " active" : ""}`} key={option.value}>
                    <input
                      checked={form.environmentTags.includes(option.value)}
                      onChange={() => toggleMultiSelect("environmentTags", option.value)}
                      type="checkbox"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        ) : null}

        {activeSection === "location" ? (
          <div className="owner-form-section-grid">
            <div className="field">
              <span>{t("form.fields.locationPicture")}</span>
              <div className="upload-zone owner-upload-zone" onClick={() => locationImageRef.current?.click()}>
                {locationImagePreview ? (
                  <img alt="Location preview" className="upload-preview-image" src={locationImagePreview} />
                ) : (
                  <>
                    <span className="upload-zone-icon">Upload</span>
                    <p style={{ fontWeight: 700, margin: 0 }}>{t("form.uploadTitle")}</p>
                    <p style={{ fontSize: "0.8rem", margin: 0 }}>{t("form.uploadSub")}</p>
                  </>
                )}
                <input
                  accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                  onChange={(event) => handleLocationImage(event.target.files?.[0])}
                  ref={locationImageRef}
                  style={{ display: "none" }}
                  type="file"
                />
              </div>
              <p className="field-hint">{geotagLoading ? t("form.checkingGeotag") : geotagMessage}</p>
            </div>

            {geotagMode === "auto" ? (
              <div className="auto-coordinate-note">
                {t("form.detectedCoordinates")}: {form.lat}, {form.lng}
              </div>
            ) : null}

            {geotagMode === "manual" ? (
              <div className="form-row">
                <label>
                  {t("form.fields.latitude")}
                  <input name="lat" onChange={updateForm} placeholder={t("form.placeholders.latitude")} required step="any" type="number" value={form.lat} />
                </label>
                <label>
                  {t("form.fields.longitude")}
                  <input name="lng" onChange={updateForm} placeholder={t("form.placeholders.longitude")} required step="any" type="number" value={form.lng} />
                </label>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="owner-form-footer">
          <button className="button-ghost" disabled={!canGoBack} onClick={goToPrevious} type="button">
            {t("form.previous")}
          </button>
          {canGoForward ? (
            <button className="button-secondary" onClick={goToNext} type="button">
              {t("form.next")}
            </button>
          ) : (
            <button className="button" disabled={saving} type="submit">
              {saving ? t("form.saving") : t("form.submit")}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

