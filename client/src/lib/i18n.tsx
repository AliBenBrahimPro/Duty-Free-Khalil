"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Locale = "en" | "fr";

const translations = {
  en: {
    // Auth
    "auth.signIn": "Sign In",
    "auth.register": "Register",
    "auth.signInTitle": "Duty Free",
    "auth.signInSubtitle": "by Khalil",
    "auth.signInDesc": "Sign in to your account",
    "auth.username": "Username",
    "auth.usernamePlaceholder": "Enter your username",
    "auth.continue": "Continue",
    "auth.noAccount": "Don't have an account?",
    "auth.hasAccount": "Already have an account?",
    "auth.notYou": "Not you?",
    "auth.enterPin": "Enter your 6-digit PIN",
    "auth.createAccount": "Join Duty Free",
    "auth.createAccountDesc": "Create your buyer account",
    "auth.firstName": "First Name",
    "auth.lastName": "Last Name",
    "auth.createPin": "Create your PIN",
    "auth.confirmPin": "Confirm your PIN",
    "auth.choosePinDesc": "Choose a 6-digit PIN to secure your account",
    "auth.confirmPinDesc": "Enter the same PIN again to confirm",
    "auth.pinMismatch": "PINs don't match. Try again.",
    "auth.backToInfo": "Back",
    "auth.addPhoto": "Add photo",
    "auth.signingIn": "Signing in...",
    "auth.creatingAccount": "Creating account...",

    // Nav
    "nav.requests": "Requests",
    "nav.orders": "Orders",
    "nav.profile": "Profile",

    // Requests
    "requests.welcomeBack": "Welcome back,",
    "requests.needsAttention": "Needs attention",
    "requests.request": "request",
    "requests.requests": "requests",
    "requests.myRequests": "My Requests",
    "requests.incomingRequests": "Incoming Requests",
    "requests.noRequests": "No requests yet",
    "requests.askForPrice": "Ask for a price",
    "requests.all": "All",
    "requests.pending": "Pending",
    "requests.priced": "Priced",
    "requests.done": "Done",
    "requests.na": "N/A",
    "requests.expired": "Expired",
    "requests.actionNeeded": "Action needed",
    "requests.setPrice": "Set a price",
    "requests.waiting": "Waiting...",

    // New Request
    "newRequest.title": "Ask for Price",
    "newRequest.askWho": "Ask who?",
    "newRequest.selectSeller": "Select a seller",
    "newRequest.productPhoto": "Product Photo",
    "newRequest.upload": "Upload",
    "newRequest.pasteUrl": "Paste URL",
    "newRequest.tapToUpload": "Tap to upload photo",
    "newRequest.urlPlaceholder": "https://example.com/perfume.jpg",
    "newRequest.productName": "Product Name",
    "newRequest.productNamePlaceholder": "e.g. Dior Sauvage 100ml",
    "newRequest.note": "Note",
    "newRequest.optional": "optional",
    "newRequest.notePlaceholder": "Any specific details...",
    "newRequest.send": "Send Request",
    "newRequest.sending": "Sending...",
    "newRequest.sellerRequired": "Please select a seller",
    "newRequest.imageOrName": "Provide a product name or image",

    // Request Detail
    "detail.title": "Request Details",
    "detail.from": "From",
    "detail.to": "To",
    "detail.price": "Price",
    "detail.enterPrice": "Set price (DT)",
    "detail.send": "Send",
    "detail.cancel": "Cancel",
    "detail.givePrice": "Give Price",
    "detail.notAvailable": "Not Available",
    "detail.acceptBuy": "Accept & Buy",
    "detail.rejectPrice": "Reject Price",
    "detail.processing": "Processing...",
    "detail.purchaseConfirmed": "Purchase Confirmed",
    "detail.goBack": "Go back",
    "detail.notFound": "Request not found",
    "detail.delete": "Delete Request",
    "detail.deleteConfirm": "Are you sure you want to delete this request?",

    // Orders
    "orders.title": "Orders",
    "orders.total": "Total",
    "orders.confirmed": "Confirmed",
    "orders.revenue": "Revenue",
    "orders.spent": "Spent",
    "orders.noOrders": "No orders yet",
    "orders.noOrdersDesc": "Confirmed purchases will appear here",

    // Profile
    "profile.title": "Profile",
    "profile.username": "Username",
    "profile.timeRemaining": "Time Remaining",
    "profile.deadline": "Deadline",
    "profile.signOut": "Sign Out",
    "profile.editProfile": "Edit Profile",
    "profile.changePin": "Change PIN",
    "profile.save": "Save",
    "profile.saving": "Saving...",
    "profile.currentPin": "Current PIN",
    "profile.newPin": "New PIN",
    "profile.confirmNewPin": "Confirm New PIN",
    "profile.pinChanged": "PIN changed successfully",
    "profile.profileUpdated": "Profile updated",

    // Status
    "status.pending": "Pending",
    "status.priced": "Priced",
    "status.unavailable": "Unavailable",
    "status.accepted": "Accepted",
    "status.rejected": "Rejected",
    "status.confirmed": "Confirmed",
    "status.expired": "Expired",
    "status.cancelled": "Cancelled",

    // Time
    "time.justNow": "Just now",
    "time.mAgo": "min ago",
    "time.hAgo": "hr ago",
    "time.dAgo": "days ago",
    "time.monthsLeft": "months remaining",
    "time.dLeft": "days",
    "time.hLeft": "hr remaining",
    "time.expired": "Expired",

    // Admin
    "nav.admin": "Dashboard",
    "admin.title": "Admin Dashboard",
    "admin.users": "Users",
    "admin.totalUsers": "Total Users",
    "admin.buyers": "Buyers",
    "admin.sellers": "Sellers",
    "admin.totalRequests": "Requests",
    "admin.totalOrders": "Orders",
    "admin.pendingRequests": "Pending",
    "admin.totalRevenue": "Total Revenue",
    "admin.role": "Role",
    "admin.joined": "Joined",
    "admin.requestsMade": "Requests",
    "admin.ordersMade": "Orders",

    // Products
    "nav.browse": "Browse",
    "nav.myProducts": "My Products",
    "products.browse": "Browse Products",
    "products.noProducts": "No products available",
    "products.inStock": "in stock",
    "products.soldOut": "Sold Out",
    "products.remaining": "remaining",
    "products.buyNow": "Buy Now",
    "products.requested": "Requested",
    "products.addProduct": "Add Product",
    "products.editProduct": "Edit Product",
    "products.name": "Product Name",
    "products.namePlaceholder": "e.g. Perfume Coffret",
    "products.price": "Price",
    "products.stock": "Stock Quantity",
    "products.description": "Description",
    "products.descPlaceholder": "Product details...",
    "products.save": "Save Product",
    "products.saving": "Saving...",
    "products.image": "Product Image",
    "products.purchases": "Purchase Requests",
    "products.noPurchases": "No purchase requests",
    "products.confirm": "Confirm",
    "products.cancel": "Cancel",
    "products.pendingPurchases": "pending",
    "products.sold": "sold",
    "products.myPurchases": "My Purchases",
    "products.limited": "Limited",
    "products.delete": "Delete Product",
    "products.deleteConfirm": "Are you sure you want to delete this product?",
    "products.deleted": "Product deleted",
    "products.edit": "Edit",

    // Audit
    "audit.title": "Audit Log",
    "audit.noLogs": "No activity yet",
    "audit.action": "Action",
    "audit.user": "User",
    "audit.details": "Details",

    // General
    "general.loading": "Loading...",
  },
  fr: {
    // Auth
    "auth.signIn": "Se connecter",
    "auth.register": "S'inscrire",
    "auth.signInTitle": "Duty Free",
    "auth.signInSubtitle": "par Khalil",
    "auth.signInDesc": "Connectez-vous a votre compte",
    "auth.username": "Nom d'utilisateur",
    "auth.usernamePlaceholder": "Entrez votre nom d'utilisateur",
    "auth.continue": "Continuer",
    "auth.noAccount": "Pas encore de compte ?",
    "auth.hasAccount": "Vous avez deja un compte ?",
    "auth.notYou": "Ce n'est pas vous ?",
    "auth.enterPin": "Entrez votre code PIN a 6 chiffres",
    "auth.createAccount": "Rejoindre Duty Free",
    "auth.createAccountDesc": "Creez votre compte acheteur",
    "auth.firstName": "Prenom",
    "auth.lastName": "Nom",
    "auth.createPin": "Creez votre PIN",
    "auth.confirmPin": "Confirmez votre PIN",
    "auth.choosePinDesc": "Choisissez un code PIN a 6 chiffres",
    "auth.confirmPinDesc": "Entrez le meme PIN pour confirmer",
    "auth.pinMismatch": "Les PIN ne correspondent pas. Reessayez.",
    "auth.backToInfo": "Retour",
    "auth.addPhoto": "Ajouter photo",
    "auth.signingIn": "Connexion...",
    "auth.creatingAccount": "Creation du compte...",

    // Nav
    "nav.requests": "Demandes",
    "nav.orders": "Commandes",
    "nav.profile": "Profil",

    // Requests
    "requests.welcomeBack": "Bon retour,",
    "requests.needsAttention": "Necessite votre attention",
    "requests.request": "demande",
    "requests.requests": "demandes",
    "requests.myRequests": "Mes Demandes",
    "requests.incomingRequests": "Demandes recues",
    "requests.noRequests": "Aucune demande",
    "requests.askForPrice": "Demander un prix",
    "requests.all": "Tout",
    "requests.pending": "En attente",
    "requests.priced": "Prix donne",
    "requests.done": "Termine",
    "requests.na": "N/D",
    "requests.expired": "Expire",
    "requests.actionNeeded": "Action requise",
    "requests.setPrice": "Donner un prix",
    "requests.waiting": "En attente...",

    // New Request
    "newRequest.title": "Demander le prix",
    "newRequest.askWho": "Demander a qui ?",
    "newRequest.selectSeller": "Choisir un vendeur",
    "newRequest.productPhoto": "Photo du produit",
    "newRequest.upload": "Importer",
    "newRequest.pasteUrl": "Coller URL",
    "newRequest.tapToUpload": "Appuyez pour importer",
    "newRequest.urlPlaceholder": "https://exemple.com/parfum.jpg",
    "newRequest.productName": "Nom du produit",
    "newRequest.productNamePlaceholder": "ex. Dior Sauvage 100ml",
    "newRequest.note": "Note",
    "newRequest.optional": "optionnel",
    "newRequest.notePlaceholder": "Details supplementaires...",
    "newRequest.send": "Envoyer la demande",
    "newRequest.sending": "Envoi...",
    "newRequest.sellerRequired": "Veuillez choisir un vendeur",
    "newRequest.imageOrName": "Ajoutez un nom ou une image du produit",

    // Request Detail
    "detail.title": "Details de la demande",
    "detail.from": "De",
    "detail.to": "A",
    "detail.price": "Prix",
    "detail.enterPrice": "Fixer le prix (DT)",
    "detail.send": "Envoyer",
    "detail.cancel": "Annuler",
    "detail.givePrice": "Donner le prix",
    "detail.notAvailable": "Non disponible",
    "detail.acceptBuy": "Accepter et acheter",
    "detail.rejectPrice": "Refuser le prix",
    "detail.processing": "Traitement...",
    "detail.purchaseConfirmed": "Achat confirme",
    "detail.goBack": "Retour",
    "detail.notFound": "Demande introuvable",
    "detail.delete": "Supprimer la demande",
    "detail.deleteConfirm": "Voulez-vous vraiment supprimer cette demande ?",

    // Orders
    "orders.title": "Commandes",
    "orders.total": "Total",
    "orders.confirmed": "Confirmees",
    "orders.revenue": "Revenus",
    "orders.spent": "Depense",
    "orders.noOrders": "Aucune commande",
    "orders.noOrdersDesc": "Les achats confirmes apparaitront ici",

    // Profile
    "profile.title": "Profil",
    "profile.username": "Nom d'utilisateur",
    "profile.timeRemaining": "Temps restant",
    "profile.deadline": "Date limite",
    "profile.signOut": "Se deconnecter",
    "profile.editProfile": "Modifier le profil",
    "profile.changePin": "Changer le PIN",
    "profile.save": "Enregistrer",
    "profile.saving": "Enregistrement...",
    "profile.currentPin": "PIN actuel",
    "profile.newPin": "Nouveau PIN",
    "profile.confirmNewPin": "Confirmer le nouveau PIN",
    "profile.pinChanged": "PIN modifie avec succes",
    "profile.profileUpdated": "Profil mis a jour",

    // Status
    "status.pending": "En attente",
    "status.priced": "Prix donne",
    "status.unavailable": "Indisponible",
    "status.accepted": "Accepte",
    "status.rejected": "Refuse",
    "status.confirmed": "Confirme",
    "status.expired": "Expire",
    "status.cancelled": "Annule",

    // Time
    "time.justNow": "A l'instant",
    "time.mAgo": "min",
    "time.hAgo": "h",
    "time.dAgo": "jours",
    "time.monthsLeft": "mois restants",
    "time.dLeft": "jours",
    "time.hLeft": "h restantes",
    "time.expired": "Expire",

    // Admin
    "nav.admin": "Tableau de bord",
    "admin.title": "Tableau de bord Admin",
    "admin.users": "Utilisateurs",
    "admin.totalUsers": "Total Utilisateurs",
    "admin.buyers": "Acheteurs",
    "admin.sellers": "Vendeurs",
    "admin.totalRequests": "Demandes",
    "admin.totalOrders": "Commandes",
    "admin.pendingRequests": "En attente",
    "admin.totalRevenue": "Revenu total",
    "admin.role": "Role",
    "admin.joined": "Inscrit",
    "admin.requestsMade": "Demandes",
    "admin.ordersMade": "Commandes",

    // Products
    "nav.browse": "Catalogue",
    "nav.myProducts": "Mes Produits",
    "products.browse": "Parcourir les produits",
    "products.noProducts": "Aucun produit disponible",
    "products.inStock": "en stock",
    "products.soldOut": "Rupture de stock",
    "products.remaining": "restants",
    "products.buyNow": "Acheter",
    "products.requested": "Demande envoyee",
    "products.addProduct": "Ajouter un produit",
    "products.editProduct": "Modifier le produit",
    "products.name": "Nom du produit",
    "products.namePlaceholder": "ex. Coffret Parfum",
    "products.price": "Prix",
    "products.stock": "Quantite en stock",
    "products.description": "Description",
    "products.descPlaceholder": "Details du produit...",
    "products.save": "Enregistrer",
    "products.saving": "Enregistrement...",
    "products.image": "Image du produit",
    "products.purchases": "Demandes d'achat",
    "products.noPurchases": "Aucune demande d'achat",
    "products.confirm": "Confirmer",
    "products.cancel": "Annuler",
    "products.pendingPurchases": "en attente",
    "products.sold": "vendus",
    "products.myPurchases": "Mes Achats",
    "products.limited": "Limite",
    "products.delete": "Supprimer le produit",
    "products.deleteConfirm": "Voulez-vous vraiment supprimer ce produit ?",
    "products.deleted": "Produit supprime",
    "products.edit": "Modifier",

    // Audit
    "audit.title": "Journal d'activite",
    "audit.noLogs": "Aucune activite",
    "audit.action": "Action",
    "audit.user": "Utilisateur",
    "audit.details": "Details",

    // General
    "general.loading": "Chargement...",
  },
} as const;

type TranslationKey = keyof typeof translations.en;

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: "fr",
  setLocale: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    const saved = localStorage.getItem("locale") as Locale | null;
    if (saved && (saved === "en" || saved === "fr")) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("locale", l);
  };

  const t = (key: TranslationKey): string => {
    return translations[locale][key] || translations.en[key] || key;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
