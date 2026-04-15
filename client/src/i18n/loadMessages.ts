import type { Locale } from "./config";

export async function loadMessages(locale: Locale) {
  if (locale === "th") {
    return {
      metadata: (await import("./messages/th/metadata.json")).default,
      common: (await import("./messages/th/common.json")).default,
      navbar: (await import("./messages/th/navbar.json")).default,
      userMenu: (await import("./messages/th/userMenu.json")).default,
      sidebar: (await import("./messages/th/sidebar.json")).default,
      localeSwitcher: (await import("./messages/th/localeSwitcher.json")).default,
      session: (await import("./messages/th/session.json")).default,
      landingPage: (await import("./messages/th/landingPage.json")).default,
      landingWorkflow: (await import("./messages/th/landingWorkflow.json")).default,
      landingFeature: (await import("./messages/th/landingFeature.json")).default,
      landingCta: (await import("./messages/th/landingCta.json")).default,
      dashboard: (await import("./messages/th/dashboard.json")).default,
      settings: (await import("./messages/th/settings.json")).default,
      auth: (await import("./messages/th/auth.json")).default,
      pricing: (await import("./messages/th/pricing.json")).default,
      admin: (await import("./messages/th/admin.json")).default,
      documents: (await import("./messages/th/documents.json")).default,
      attachFile: (await import("./messages/th/attachFile.json")).default,
      confirmDialog: (await import("./messages/th/confirmDialog.json")).default,
    };
  }

  return {
    metadata: (await import("./messages/en/metadata.json")).default,
    common: (await import("./messages/en/common.json")).default,
    navbar: (await import("./messages/en/navbar.json")).default,
    userMenu: (await import("./messages/en/userMenu.json")).default,
    sidebar: (await import("./messages/en/sidebar.json")).default,
    localeSwitcher: (await import("./messages/en/localeSwitcher.json")).default,
    session: (await import("./messages/en/session.json")).default,
    landingPage: (await import("./messages/en/landingPage.json")).default,
    landingWorkflow: (await import("./messages/en/landingWorkflow.json")).default,
    landingFeature: (await import("./messages/en/landingFeature.json")).default,
    landingCta: (await import("./messages/en/landingCta.json")).default,
    dashboard: (await import("./messages/en/dashboard.json")).default,
    settings: (await import("./messages/en/settings.json")).default,
    auth: (await import("./messages/en/auth.json")).default,
    pricing: (await import("./messages/en/pricing.json")).default,
    admin: (await import("./messages/en/admin.json")).default,
    documents: (await import("./messages/en/documents.json")).default,
    attachFile: (await import("./messages/en/attachFile.json")).default,
    confirmDialog: (await import("./messages/en/confirmDialog.json")).default,
  };
}
