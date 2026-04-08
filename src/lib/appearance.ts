/** Appearance settings shape stored in project.settings.appearance */
export interface AppearanceSettings {
  primaryColor: string;
  backgroundColor: string;
  darkMode: "light" | "dark" | "system";
  logoLight: string | null;
  logoDark: string | null;
  favicon: string | null;
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  primaryColor: "#16A34A",
  backgroundColor: "#FFFFFF",
  darkMode: "system",
  logoLight: null,
  logoDark: null,
  favicon: null,
};

/** Validate a hex color string */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/** Merge partial appearance settings with defaults */
export function mergeAppearance(
  partial: Partial<AppearanceSettings>,
): AppearanceSettings {
  return { ...DEFAULT_APPEARANCE, ...partial };
}

/** Validate appearance settings before saving */
export function validateAppearance(
  settings: Partial<AppearanceSettings>,
): { valid: true } | { valid: false; error: string } {
  if (
    settings.primaryColor !== undefined &&
    !isValidHexColor(settings.primaryColor)
  ) {
    return { valid: false, error: "Invalid primary color hex value" };
  }
  if (
    settings.backgroundColor !== undefined &&
    !isValidHexColor(settings.backgroundColor)
  ) {
    return { valid: false, error: "Invalid background color hex value" };
  }
  if (
    settings.darkMode !== undefined &&
    !["light", "dark", "system"].includes(settings.darkMode)
  ) {
    return { valid: false, error: "Dark mode must be light, dark, or system" };
  }
  return { valid: true };
}

/** Build the filename for uploaded assets */
export function buildAssetFilename(
  type: "logo-light" | "logo-dark" | "favicon",
  originalFilename: string,
): string {
  const ext = originalFilename.split(".").pop() ?? "png";
  return `${type}.${ext}`;
}
