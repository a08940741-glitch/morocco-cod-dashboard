import { products } from "./catalog.js";

export interface OutboundMessage {
  to: string;
  text: string;
  sentAt: string;
}

function formatCatalogPriceList(): string {
  return products
    .map((product) => `${product.name}: ${product.priceMad} درهم | المخزون: ${product.stock} قطعة`)
    .join("؛ ");
}

function findProductByText(input: string) {
  const normalized = input.toLocaleLowerCase("fr");
  return products.find((product) => {
    const name = product.name.toLocaleLowerCase("fr");
    const id = product.id.toLocaleLowerCase("fr");
    const haystack = `${name} ${product.description}`.toLocaleLowerCase("fr");
    return normalized.includes(name) || normalized.includes(id) || haystack.includes(normalized.split(" ")[0] ?? "");
  });
}

export class MockWhatsAppAdapter {
  readonly sentMessages: OutboundMessage[] = [];

  async sendMessage(to: string, text: string): Promise<void> {
    this.sentMessages.push({ to, text, sentAt: new Date().toISOString() });
  }
}

export class MockClaudeProvider {
  async reply(message: string): Promise<string> {
    const text = (message ?? "").trim();
    if (!text) {
      return "مرحبا! أستطيع مساعدتك في الأسعار، التوصيل، الدفع عند الاستلام، وتسجيل الطلبات التجريبية.";
    }

    const normalized = text.toLocaleLowerCase("fr");
    const hasArabic = /[\u0600-\u06ff]/.test(text);
    const hasFrench = /livraison|paiement|produit|prix|commande|agent|bonjour|merci|catalogue/.test(normalized);

    if (/موظف|agent|human|employe|employee|تدخل بشري/.test(normalized)) {
      return hasArabic
        ? "نعم، يمكن تحويل المحادثة إلى موظف يدويًا من لوحة الإدارة. هذا نموذج محلي فقط، ولا يتم إرسال أي رسالة حقيقية."
        : "Oui, vous pouvez transférer la conversation à un employé depuis le tableau de bord. C'est une démo locale, aucun message réel n'est envoyé.";
    }

    if (hasArabic) {
      if (/توصيل|التوصيل|شحن|delivery|livraison|expedition|expédition/.test(normalized)) {
        return "التوصيل محاكاة محلية، والرسوم التقديرية هي 25 درهم لكل طلب مسلّم. الدفع عند الاستلام (COD) متاح، والطلب يبقى في انتظار تأكيدك الصريح.";
      }
      if (/مخزون|متوفر|التوفر|stock|disponible|available/.test(normalized)) {
        return `حالة المخزون الحالية: ${products.map((product) => `${product.name}: ${product.stock} قطعة`).join("؛ ")}.`;
      }
      if (/ثمن|سعر|prix|بكم|بشحال|كم|قدر|كلفة/.test(normalized)) {
        const product = findProductByText(text) ?? products[0];
        return product
          ? `${product.name} غالي بـ ${product.priceMad} درهم و${product.stock > 0 ? `متوفر (${product.stock} قطعة)` : "غير متوفر الآن"}.`
          : `أسعار المنتجات الحالية: ${formatCatalogPriceList()}.`;
      }
      if (/طلب|commande|حالة|status|suivi|تتبع/.test(normalized)) {
        return "يمكن متابعة الطلب من لوحة الإدارة المحلية. في هذا النموذج، الحالة تتغير يدويًا بين: انتظار التأكيد، مؤكد، قيد التجهيز، شحن، تسليم، أو ملغى.";
      }
      if (/دفع|paiement|cash|كاش|COD|الدفع/.test(normalized)) {
        return "الدفع عند الاستلام (COD) هو الخيار المسمور في هذا النموذج. يجب تأكيد الطلب صراحة قبل أن يصبح مؤكدًا.";
      }
      if (/منتج|catalogue|catalog|منتجات|قائمة/.test(normalized)) {
        return `قائمة المنتجات الحالية: ${formatCatalogPriceList()}.`;
      }
      return "مرحبا! أستطيع مساعدتك في أسعار المنتجات، المخزون، التوصيل، والدفع عند الاستلام. إذا أردت، أستطيع تحويل المحادثة إلى موظف.";
    }

    if (hasFrench || /bonjour|salut|merci/.test(normalized)) {
      if (/livraison|délai|delai|expédition|expedition/.test(normalized)) {
        return "La livraison est simulée dans cette démo locale. Pour un colis, le statut est visible dans le tableau de bord et le paiement est à la livraison (COD).";
      }
      if (/stock|disponible|quantite|quantité|available/.test(normalized)) {
        return `Disponibilité actuelle: ${products.map((product) => `${product.name}: ${product.stock} pièces`).join("; ")}.`;
      }
      if (/prix|tarif|coût|cout|payer|combien|montant/.test(normalized)) {
        const product = findProductByText(text) ?? products[0];
        return product
          ? `${product.name} coûte ${product.priceMad} MAD et ${product.stock > 0 ? `est disponible (${product.stock} pièces)` : "n'est plus disponible"}.`
          : `Prix du catalogue: ${formatCatalogPriceList().replace(/درهم/g, "MAD").replace(/؛/g, "; ")}.`;
      }
      if (/commande|suivi|statut|ordre/.test(normalized)) {
        return "Le statut de la commande est géré localement dans le tableau de bord: attente de confirmation, confirmé, préparation, expédié, livré ou annulé.";
      }
      if (/paiement|cod|cash|payer|espèces|especes/.test(normalized)) {
        return "Le paiement à la livraison (COD) est le mode pris en charge dans cette démo. La commande doit être confirmée explicitement.";
      }
      if (/produit|catalogue|produits/.test(normalized)) {
        return `Catalogue local: ${products.map((product) => `${product.name} ${product.priceMad} MAD`).join("; ")}.`;
      }
      return "Bonjour ! Je peux vous aider sur les prix, la disponibilité, le COD et le suivi des commandes. Demandez un transfert vers un agent si nécessaire.";
    }

    return "Bonjour ! Je peux vous renseigner sur les produits, le paiement à la livraison et le statut des commandes. Écrivez « agent » pour un intervenant humain.";
  }
}
