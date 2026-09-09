/**
 * Store — data layer backed by Supabase.
 *
 * Same shape as the old localStorage version (same function names),
 * but every method now returns a Promise since it talks to a real
 * database over the network. Every page calling Store must use
 * `await` / `.then()`.
 *
 * Requires js/supabase-client.js to be loaded first (defines
 * `supabaseClient`).
 */

const TECH_LABELS = {
  ip: "IP / Numérique Haute Résolution",
  analogique: "Analogique HD (TVI/AHD)",
  "sans-fil": "Radio Sans Fil cryptée",
};

const Store = (function () {
  // ---------- helpers: DB row (snake_case) <-> app object (camelCase) ----------

  function productFromRow(row) {
    return {
      id: row.id,
      reference: row.reference,
      name: row.name,
      description: row.description,
      categoryId: row.category_id,
      tech: row.tech,
      techLabel: TECH_LABELS[row.tech] || row.tech,
      price: Number(row.price),
      stock: row.stock,
      availability: row.availability,
      imageUrl: row.image_url,
      createdAt: row.created_at,
    };
  }

  function productToRow(data) {
    return {
      reference: data.reference,
      name: data.name,
      description: data.description,
      category_id: data.categoryId,
      tech: data.tech,
      price: data.price,
      stock: data.stock,
      availability: data.availability,
      image_url: data.imageUrl,
    };
  }

  function categoryFromRow(row) {
    return { id: row.id, label: row.label, icon: row.icon };
  }

  function realisationFromRow(row) {
    return {
      id: row.id,
      title: row.title,
      client: row.client,
      categoryId: row.category_id,
      location: row.location,
      year: row.year,
      description: row.description,
      imageUrl: row.image_url,
      createdAt: row.created_at,
    };
  }

  function realisationToRow(data) {
    return {
      title: data.title,
      client: data.client,
      category_id: data.categoryId,
      location: data.location,
      year: data.year,
      description: data.description,
      image_url: data.imageUrl,
    };
  }

  function devisFromRow(row) {
    return {
      id: row.id,
      nom: row.nom,
      telephone: row.telephone,
      typologie: row.typologie,
      surface: row.surface,
      acces: row.acces,
      equipements: row.equipements || [],
      adresse: row.adresse,
      visite: row.visite,
      status: row.status,
      items: row.items || [],
      createdAt: row.created_at,
    };
  }

  function messageFromRow(row) {
    return {
      id: row.id,
      nom: row.nom,
      email: row.email,
      message: row.message,
      read: row.read,
      createdAt: row.created_at,
    };
  }

  function check(result, context) {
    if (result.error) {
      console.error(`Store error (${context}):`, result.error);
      throw result.error;
    }
    return result.data;
  }

  return {
    // ---------- Categories ----------
    async getCategories() {
      const res = await supabaseClient.from("categories").select("*").order("created_at");
      return check(res, "getCategories").map(categoryFromRow);
    },
    async getCategory(id) {
      const res = await supabaseClient.from("categories").select("*").eq("id", id).maybeSingle();
      const row = check(res, "getCategory");
      return row ? categoryFromRow(row) : null;
    },
    async addCategory({ label, icon }) {
      const res = await supabaseClient
        .from("categories")
        .insert({ label, icon: icon || "shapes" })
        .select()
        .single();
      return categoryFromRow(check(res, "addCategory"));
    },
    async updateCategory(id, patch) {
      const res = await supabaseClient.from("categories").update(patch).eq("id", id);
      check(res, "updateCategory");
    },
    async deleteCategory(id) {
      const products = await this.getProducts();
      const inUse = products.some((p) => p.categoryId === id);
      if (inUse) return { ok: false, reason: "in-use" };
      const res = await supabaseClient.from("categories").delete().eq("id", id);
      check(res, "deleteCategory");
      return { ok: true };
    },

    // ---------- Products ----------
    async getProducts() {
      const res = await supabaseClient.from("products").select("*").order("created_at", { ascending: false });
      return check(res, "getProducts").map(productFromRow);
    },
    async getProduct(id) {
      const res = await supabaseClient.from("products").select("*").eq("id", id).maybeSingle();
      const row = check(res, "getProduct");
      return row ? productFromRow(row) : null;
    },
    async addProduct(data) {
      const res = await supabaseClient.from("products").insert(productToRow(data)).select().single();
      return productFromRow(check(res, "addProduct"));
    },
    async updateProduct(id, patch) {
      const res = await supabaseClient.from("products").update(productToRow(patch)).eq("id", id);
      check(res, "updateProduct");
    },
    async deleteProduct(id) {
      const res = await supabaseClient.from("products").delete().eq("id", id);
      check(res, "deleteProduct");
    },

    // ---------- Realisations (portfolio) ----------
    async getRealisations() {
      const res = await supabaseClient.from("realisations").select("*").order("created_at", { ascending: false });
      return check(res, "getRealisations").map(realisationFromRow);
    },
    async getRealisation(id) {
      const res = await supabaseClient.from("realisations").select("*").eq("id", id).maybeSingle();
      const row = check(res, "getRealisation");
      return row ? realisationFromRow(row) : null;
    },
    async addRealisation(data) {
      const res = await supabaseClient.from("realisations").insert(realisationToRow(data)).select().single();
      return realisationFromRow(check(res, "addRealisation"));
    },
    async updateRealisation(id, patch) {
      const res = await supabaseClient.from("realisations").update(realisationToRow(patch)).eq("id", id);
      check(res, "updateRealisation");
    },
    async deleteRealisation(id) {
      const res = await supabaseClient.from("realisations").delete().eq("id", id);
      check(res, "deleteRealisation");
    },

    // ---------- Devis (quote) requests ----------
    async getDevisRequests() {
      const res = await supabaseClient.from("devis_requests").select("*").order("created_at", { ascending: false });
      return check(res, "getDevisRequests").map(devisFromRow);
    },
    async addDevisRequest(payload) {
      const row = {
        nom: payload.nom,
        telephone: payload.telephone,
        typologie: payload.typologie,
        surface: payload.surface ? Number(payload.surface) : null,
        acces: payload.acces ? Number(payload.acces) : null,
        equipements: payload.equipements || [],
        adresse: payload.adresse,
        visite: payload.visite,
        items: payload.items || [],
      };
      const res = await supabaseClient.from("devis_requests").insert(row).select().single();
      return devisFromRow(check(res, "addDevisRequest"));
    },
    async updateDevisStatus(id, status) {
      const res = await supabaseClient.from("devis_requests").update({ status }).eq("id", id);
      check(res, "updateDevisStatus");
    },
    async deleteDevisRequest(id) {
      const res = await supabaseClient.from("devis_requests").delete().eq("id", id);
      check(res, "deleteDevisRequest");
    },

    // ---------- Contact messages ----------
    async getMessages() {
      const res = await supabaseClient.from("contact_messages").select("*").order("created_at", { ascending: false });
      return check(res, "getMessages").map(messageFromRow);
    },
    async addMessage(payload) {
      const res = await supabaseClient
        .from("contact_messages")
        .insert({ nom: payload.nom, email: payload.email, message: payload.message })
        .select()
        .single();
      return messageFromRow(check(res, "addMessage"));
    },
    async markMessageRead(id) {
      const res = await supabaseClient.from("contact_messages").update({ read: true }).eq("id", id);
      check(res, "markMessageRead");
    },
    async deleteMessage(id) {
      const res = await supabaseClient.from("contact_messages").delete().eq("id", id);
      check(res, "deleteMessage");
    },
  };
})();
