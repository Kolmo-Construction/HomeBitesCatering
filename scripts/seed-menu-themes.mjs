import pg from 'pg';
const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// Helper to build a category item
const item = (id, name, upcharge = 0, opts = {}) => ({
  id,
  name,
  upchargeCents: upcharge * 100,
  ...opts,
});

// ====================
// TACO FIESTA
// ====================
const tacoFiesta = {
  name: "Taco Fiesta",
  description: "Authentic Mexican fiesta with bold flavors and fresh ingredients.",
  type: "standard",
  event_type: "other",
  theme_key: "taco_fiesta",
  display_order: 1,
  display_on_customer_form: true,
  is_publicly_visible: true,
  recipes: [],
  packages: [
    {
      tierKey: "bronze", tierName: "Bronze", pricePerPersonCents: 2800,
      description: "3 proteins, 2 sides, 3 salsas, 5 condiments",
      displayOrder: 1, minGuestCount: 50,
      selectionLimits: { protein: 3, side: 2, salsa: 3, condiment: 5 },
    },
    {
      tierKey: "silver", tierName: "Silver", pricePerPersonCents: 3400,
      description: "4 proteins, 3 sides, 4 salsas, 6 condiments",
      displayOrder: 2,
      selectionLimits: { protein: 4, side: 3, salsa: 4, condiment: 6 },
    },
    {
      tierKey: "gold", tierName: "Gold", pricePerPersonCents: 4000,
      description: "4 proteins, 4 sides, 4 salsas, 8 condiments",
      displayOrder: 3,
      selectionLimits: { protein: 4, side: 4, salsa: 4, condiment: 8 },
    },
    {
      tierKey: "diamond", tierName: "Diamond", pricePerPersonCents: 4600,
      description: "5 proteins, 5 sides, 5 salsas, 8 condiments + chips & salsa appetizer",
      displayOrder: 4,
      selectionLimits: { protein: 5, side: 5, salsa: 5, condiment: 8 },
      included: ["Chips & Salsa Appetizer"],
    },
  ],
  category_items: {
    protein: [
      item("barbacoa", "Barbacoa"),
      item("flank_steak_fajitas", "Flank Steak Fajitas", 2),
      item("ground_beef", "Ground Beef"),
      item("pork_carnitas", "Pork Carnitas"),
      item("pork_belly", "Pork Belly"),
      item("chorizo", "Chorizo"),
      item("beef_birria", "Beef Birria"),
      item("mexican_chicken", "Mexican Chicken"),
      item("cod", "Cod"),
      item("shrimp", "Shrimp"),
      item("tofu", "Tofu", 0, { dietaryTags: ["vegan", "vegetarian"] }),
      item("roasted_vegetables", "Roasted Vegetables", 0, { dietaryTags: ["vegan", "vegetarian", "gluten_free"] }),
    ],
    side: [
      item("refried_beans", "Refried Beans"),
      item("elotes", "Mexican Street Corn (Elotes)"),
      item("queso_dip", "Queso Dip"),
      item("chorizo_queso_dip", "Chorizo Queso Dip"),
      item("stuffed_poblano_peppers", "Stuffed Poblano Peppers"),
      item("mexican_rice", "Mexican Rice"),
      item("cilantro_lime_rice", "Cilantro Lime Rice"),
      item("rice_and_beans", "Rice and Beans"),
      item("jalapeno_cornbread", "Jalapeño Cornbread"),
      item("grilled_vegetables", "Grilled Vegetables"),
      item("mexican_slaw_mango", "Mexican Slaw with Mango"),
      item("vegetarian_empanadas", "Vegetarian Empanadas"),
    ],
    salsa: [
      item("pico_de_gallo", "Classic Pico de Gallo"),
      item("mango_salsa", "Fresh Mango Salsa"),
      item("pineapple_habanero", "Pineapple Habanero Salsa"),
      item("cucumber_apple", "Cucumber & Apple Salsa"),
      item("salsa_roja", "Salsa Roja"),
      item("salsa_verde", "Salsa Verde"),
      item("creamy_salsa_verde", "Creamy Salsa Verde"),
    ],
    condiment: [
      item("shredded_cheese", "Shredded Cheese"),
      item("shredded_vegan_cheese", "Shredded Vegan Cheese"),
      item("diced_onions", "Diced Onions"),
      item("lime_wedges", "Lime Wedges"),
      item("jalapenos", "Jalapeños"),
      item("sour_cream", "Sour Cream"),
      item("diced_bell_peppers", "Diced Bell Peppers"),
      item("guacamole", "Guacamole"),
      item("fire_roasted_bell_peppers", "Fire Roasted Bell Peppers"),
      item("sliced_radish", "Sliced Radish"),
      item("cilantro", "Cilantro"),
      item("pickled_cabbage", "Pickled Cabbage"),
      item("escabeche", "Escabeche"),
    ],
  },
};

// ====================
// AMERICAN BBQ
// ====================
const americanBBQ = {
  name: "American BBQ",
  description: "Classic American BBQ with smoked meats, hearty sides, and rich sauces.",
  type: "standard",
  event_type: "other",
  theme_key: "bbq",
  display_order: 2,
  display_on_customer_form: true,
  is_publicly_visible: true,
  recipes: [],
  packages: [
    {
      tierKey: "bronze", tierName: "Bronze", pricePerPersonCents: 3200,
      description: "3 mains, 2 sides, 2 salads, 3 condiments, 2 sauces",
      displayOrder: 1, minGuestCount: 50,
      selectionLimits: { protein: 3, side: 2, salad: 2, condiment: 3, sauce: 2 },
    },
    {
      tierKey: "silver", tierName: "Silver", pricePerPersonCents: 3800,
      description: "4 mains, 3 sides, 2 salads, 3 condiments, 2 sauces",
      displayOrder: 2,
      selectionLimits: { protein: 4, side: 3, salad: 2, condiment: 3, sauce: 2 },
    },
    {
      tierKey: "gold", tierName: "Gold", pricePerPersonCents: 4600,
      description: "4 mains, 4 sides, 3 salads, 4 condiments, 3 sauces",
      displayOrder: 3,
      selectionLimits: { protein: 4, side: 4, salad: 3, condiment: 4, sauce: 3 },
    },
    {
      tierKey: "diamond", tierName: "Diamond", pricePerPersonCents: 5400,
      description: "5 mains, 5 sides, 3 salads, 4 condiments, 4 sauces",
      displayOrder: 4,
      selectionLimits: { protein: 5, side: 5, salad: 3, condiment: 4, sauce: 4 },
    },
  ],
  category_items: {
    protein: [
      item("prime_rib", "Prime Rib (carving station)", 4),
      item("smoked_brisket", "Smoked Brisket", 2),
      item("beef_ribs", "Beef Ribs", 3),
      item("guinness_short_ribs", "Guinness Braised Boneless Short Ribs", 2),
      item("bacon_wrapped_filet", "Bacon Wrapped Filet Mignon", 4),
      item("flank_steak_chimichurri", "Flank Steak with Chimichurri"),
      item("sausage_medley", "Sausage Medley"),
      item("hamburger_bar", "Hamburger Bar", 1.5),
      item("lamb_chops", "Lamb Chops", 3),
      item("smoked_leg_of_lamb", "Smoked Leg of Lamb (Family Style)"),
      item("pulled_pork", "Pulled Pork"),
      item("korean_pork_chop", "Bone-in Grilled Pork Chop with Korean BBQ"),
      item("korean_pork_belly", "Smoked Pork Belly with Korean BBQ"),
      item("baby_back_ribs", "Baby Back Ribs"),
      item("bbq_guinness_chicken", "BBQ Guinness Chicken"),
      item("carolina_bbq_chicken", "Carolina BBQ Chicken"),
      item("rotisserie_chicken", "Rotisserie Chicken"),
      item("bbq_prawns", "BBQ Prawns", 2),
      item("salmon_steak", "Salmon Steak"),
      item("tofu", "Tofu", 0, { dietaryTags: ["vegan", "vegetarian"] }),
      item("vegetable_kebabs", "Vegetable Kebabs", 0, { dietaryTags: ["vegan", "vegetarian"] }),
      item("grilled_cauliflower", "Grilled Cauliflower Steaks", 0, { dietaryTags: ["vegan", "vegetarian"] }),
    ],
    side: [
      item("ham_hock_beans", "Ham Hock Baked Beans"),
      item("avocado_deviled_eggs", "Avocado Deviled Eggs"),
      item("mac_n_cheese", "Mac n' Cheese"),
      item("stuffed_poblanos", "Stuffed Poblano Peppers"),
      item("baked_potato_bar", "Baked Potato Bar", 1.5),
      item("garlic_mashed_potatoes", "Garlic Mashed Potatoes"),
      item("mini_smashed_potatoes", "Mini Smashed Potatoes"),
      item("twice_baked_potatoes", "Twice Baked Potatoes", 0.5),
      item("corn_on_the_cob", "Corn on the Cob"),
      item("creamed_corn", "Creamed Corn"),
      item("jalapeno_poppers", "Jalapeño Poppers"),
      item("roasted_brussels", "Roasted Brussels Sprouts"),
      item("corn_bread", "Corn Bread"),
      item("jalapeno_cornbread", "Jalapeño Cornbread"),
      item("grilled_vegetables", "Grilled Vegetables"),
      item("grilled_asparagus", "Grilled Asparagus"),
    ],
    salad: [
      item("caesar", "Caesar Salad"),
      item("coleslaw", "Coleslaw"),
      item("garden_salad", "Garden Salad"),
      item("pasta_salad", "Pasta Salad"),
      item("bacon_jalapeno_corn", "Bacon Jalapeño Corn Salad"),
      item("wedge", "Wedge Salad"),
      item("german_cucumber", "German Cucumber Salad"),
      item("crunchy_asian_slaw", "Crunchy Asian Slaw"),
      item("tossed_cobb", "Tossed Cobb Salad"),
      item("classic_potato", "Classic Potato Salad"),
      item("german_potato", "German Potato Salad"),
      item("macaroni", "Macaroni Salad"),
      item("hawaiian_macaroni", "Hawaiian Macaroni Salad"),
      item("fruit_salad", "Fruit Salad"),
    ],
    sauce: [
      item("kansas_city", "Kansas City BBQ"),
      item("carolina_gold", "South Carolina Gold BBQ"),
      item("carolina_vinegar", "North Carolina Vinegar BBQ"),
      item("alabama_white", "Alabama White BBQ"),
      item("texas_bbq", "Texas BBQ"),
      item("very_berry", "Very Berry BBQ"),
      item("smoky_bourbon", "Smoky Bourbon BBQ"),
    ],
    condiment: [
      item("ketchup", "Ketchup"),
      item("stone_ground_mustard", "Stone Ground Mustard"),
      item("dijon_mustard", "Dijon Mustard"),
      item("yellow_mustard", "Yellow Mustard"),
      item("mayonnaise", "Mayonnaise"),
      item("sweet_pickle_chips", "Sweet Pickle Chips"),
      item("dill_pickle_chips", "Dill Pickle Chips"),
      item("sliced_radish", "Sliced Radish"),
      item("sweet_relish", "Sweet Relish"),
      item("cranberry_relish", "Cranberry Relish"),
      item("kimchi", "Kimchi"),
      item("giardiniera", "Mixed Pickled Vegetables (Giardiniera)"),
    ],
  },
};

// ====================
// TASTE OF GREECE
// ====================
const greece = {
  name: "A Taste of Greece",
  description: "Mediterranean flavors with fresh herbs, grilled meats, and vibrant salads.",
  type: "standard",
  event_type: "other",
  theme_key: "greece",
  display_order: 3,
  display_on_customer_form: true,
  is_publicly_visible: true,
  recipes: [],
  packages: [
    { tierKey: "bronze", tierName: "Bronze", pricePerPersonCents: 3200, description: "3 mains, 3 sides, 2 salads, 3 spreads", displayOrder: 1, minGuestCount: 50, selectionLimits: { protein: 3, side: 3, salad: 2, spread: 3 } },
    { tierKey: "silver", tierName: "Silver", pricePerPersonCents: 3800, description: "4 mains, 4 sides, 3 salads, 4 spreads", displayOrder: 2, selectionLimits: { protein: 4, side: 4, salad: 3, spread: 4 } },
    { tierKey: "gold", tierName: "Gold", pricePerPersonCents: 4600, description: "5 mains, 5 sides, 4 salads, 5 spreads", displayOrder: 3, selectionLimits: { protein: 5, side: 5, salad: 4, spread: 5 } },
    { tierKey: "diamond", tierName: "Diamond", pricePerPersonCents: 5900, description: "6 mains, 6 sides, 4 salads, 6 spreads", displayOrder: 4, selectionLimits: { protein: 6, side: 6, salad: 4, spread: 6 } },
  ],
  category_items: {
    protein: [
      item("gyro_chicken", "Gyro Chicken"),
      item("gyro_lamb_beef", "Gyro Lamb & Beef"),
      item("lemon_oregano_chicken", "Lemon Oregano Chicken"),
      item("grilled_lamb_chops", "Grilled Lamb Chops", 3),
      item("braised_lamb_shank", "Braised Lamb Shank", 2),
      item("souvlaki_chicken", "Chicken Souvlaki"),
      item("souvlaki_pork", "Pork Souvlaki"),
      item("keftedes", "Keftedes (Greek Meatballs)"),
      item("pastitsio", "Pastitsio"),
      item("moussaka", "Moussaka"),
      item("branzino", "Whole Grilled Branzino", 2),
      item("baked_cod", "Baked Cod"),
      item("spanakopita", "Spanakopita", 0, { dietaryTags: ["vegetarian"] }),
      item("tyropita", "Tyropita", 0, { dietaryTags: ["vegetarian"] }),
    ],
    side: [
      item("lemon_potatoes", "Lemon Potatoes"),
      item("rice_pilaf", "Greek Rice Pilaf"),
      item("orzo", "Orzo with Herbs"),
      item("roasted_vegetables", "Roasted Mediterranean Vegetables"),
      item("briam", "Briam (Greek Ratatouille)"),
      item("gigante_beans", "Gigante Beans"),
      item("fasolakia", "Fasolakia (Green Beans)"),
      item("dolmades", "Dolmades (Stuffed Grape Leaves)"),
      item("saganaki", "Saganaki (Fried Cheese)"),
      item("horta", "Horta (Wild Greens)"),
      item("grilled_halloumi", "Grilled Halloumi", 1),
    ],
    salad: [
      item("horiatiki", "Horiatiki (Greek Village Salad)"),
      item("lettuce_salad", "Romaine & Dill Salad"),
      item("beet_salad", "Roasted Beet Salad"),
      item("watermelon_feta", "Watermelon & Feta Salad"),
      item("cabbage_carrot", "Cabbage & Carrot Salad"),
      item("fattoush", "Fattoush"),
      item("tabbouleh", "Tabbouleh"),
    ],
    spread: [
      item("tzatziki", "Tzatziki"),
      item("hummus", "Hummus"),
      item("taramasalata", "Taramasalata"),
      item("baba_ghanoush", "Baba Ghanoush"),
      item("spicy_feta", "Spicy Feta (Tirokafteri)"),
      item("melitzanosalata", "Melitzanosalata"),
      item("skordalia", "Skordalia"),
    ],
  },
};

// ====================
// KEBAB PARTY
// ====================
const kebab = {
  name: "Kebab Party",
  description: "Mediterranean and Middle Eastern kebabs with aromatic spices.",
  type: "standard",
  event_type: "other",
  theme_key: "kebab",
  display_order: 4,
  display_on_customer_form: true,
  is_publicly_visible: true,
  recipes: [],
  packages: [
    { tierKey: "bronze", tierName: "Bronze", pricePerPersonCents: 3500, description: "3 proteins, 3 sides, 2 salads, 3 spreads", displayOrder: 1, minGuestCount: 50, selectionLimits: { protein: 3, side: 3, salad: 2, spread: 3 } },
    { tierKey: "silver", tierName: "Silver", pricePerPersonCents: 3900, description: "4 proteins, 4 sides, 3 salads, 4 spreads", displayOrder: 2, selectionLimits: { protein: 4, side: 4, salad: 3, spread: 4 } },
    { tierKey: "gold", tierName: "Gold", pricePerPersonCents: 4900, description: "5 proteins, 5 sides, 3 salads, 5 spreads", displayOrder: 3, selectionLimits: { protein: 5, side: 5, salad: 3, spread: 5 } },
    { tierKey: "diamond", tierName: "Diamond", pricePerPersonCents: 6300, description: "6 proteins, 6 sides, 4 salads, 6 spreads", displayOrder: 4, selectionLimits: { protein: 6, side: 6, salad: 4, spread: 6 } },
  ],
  category_items: {
    protein: [
      item("chicken_shish", "Chicken Shish Kebab"),
      item("lamb_shish", "Lamb Shish Kebab", 2),
      item("beef_shish", "Beef Shish Kebab", 2),
      item("kofta_lamb", "Lamb Kofta"),
      item("kofta_beef", "Beef Kofta"),
      item("adana", "Adana Kebab"),
      item("iskender", "Iskender Kebab"),
      item("shawarma_chicken", "Chicken Shawarma"),
      item("shawarma_beef", "Beef Shawarma"),
      item("tofu_kebab", "Tofu Kebab", 0, { dietaryTags: ["vegan", "vegetarian"] }),
      item("paneer_tikka", "Paneer Tikka", 0, { dietaryTags: ["vegetarian"] }),
      item("vegetable_kebab", "Vegetable Kebab", 0, { dietaryTags: ["vegan", "vegetarian"] }),
    ],
    side: [
      item("saffron_rice", "Saffron Rice"),
      item("basmati_rice", "Basmati Rice"),
      item("bulgur_pilaf", "Bulgur Pilaf"),
      item("mujadara", "Mujadara"),
      item("falafel", "Falafel", 0, { dietaryTags: ["vegan", "vegetarian"] }),
      item("stuffed_grape_leaves", "Stuffed Grape Leaves"),
      item("roasted_cauliflower", "Roasted Cauliflower"),
      item("eggplant_stew", "Eggplant Stew"),
      item("pita_bread", "Fresh Pita Bread"),
    ],
    salad: [
      item("fattoush", "Fattoush"),
      item("tabbouleh", "Tabbouleh"),
      item("mediterranean", "Mediterranean Salad"),
      item("shirazi", "Shirazi Salad"),
      item("cucumber_tomato", "Cucumber Tomato Salad"),
      item("beet_yogurt", "Beet & Yogurt Salad"),
    ],
    spread: [
      item("hummus", "Hummus"),
      item("baba_ghanoush", "Baba Ghanoush"),
      item("muhammara", "Muhammara"),
      item("labneh", "Labneh"),
      item("tzatziki", "Tzatziki"),
      item("garlic_sauce", "Lebanese Garlic Sauce (Toum)"),
    ],
  },
};

// ====================
// TASTE OF ITALY
// ====================
const italy = {
  name: "A Taste of Italy",
  description: "Traditional Italian cuisine with fresh pasta, rich sauces, and authentic ingredients.",
  type: "standard",
  event_type: "other",
  theme_key: "italy",
  display_order: 5,
  display_on_customer_form: true,
  is_publicly_visible: true,
  recipes: [],
  packages: [
    { tierKey: "bronze", tierName: "Bronze", pricePerPersonCents: 3200, description: "2 mains, 2 pasta, 2 sides, 2 salads", displayOrder: 1, minGuestCount: 50, selectionLimits: { protein: 2, pasta: 2, side: 2, salad: 2 } },
    { tierKey: "silver", tierName: "Silver", pricePerPersonCents: 3800, description: "3 mains, 3 pasta, 3 sides, 3 salads", displayOrder: 2, selectionLimits: { protein: 3, pasta: 3, side: 3, salad: 3 } },
    { tierKey: "gold", tierName: "Gold", pricePerPersonCents: 4600, description: "4 mains, 3 pasta, 4 sides, 3 salads", displayOrder: 3, selectionLimits: { protein: 4, pasta: 3, side: 4, salad: 3 } },
    { tierKey: "diamond", tierName: "Diamond", pricePerPersonCents: 5800, description: "5 mains, 4 pasta, 5 sides, 4 salads", displayOrder: 4, selectionLimits: { protein: 5, pasta: 4, side: 5, salad: 4 } },
  ],
  category_items: {
    protein: [
      item("chicken_parmigiana", "Chicken Parmigiana"),
      item("chicken_marsala", "Chicken Marsala"),
      item("chicken_piccata", "Chicken Piccata"),
      item("veal_scaloppine", "Veal Scaloppine", 3),
      item("eggplant_rollatini", "Eggplant Rollatini", 0, { dietaryTags: ["vegetarian"] }),
      item("osso_buco", "Osso Buco", 4),
      item("braised_short_ribs", "Braised Short Ribs", 2),
      item("meatballs", "Italian Meatballs"),
      item("italian_sausage", "Italian Sausage & Peppers"),
      item("grilled_salmon", "Grilled Salmon", 3),
      item("shrimp_scampi", "Shrimp Scampi", 2),
      item("branzino", "Whole Branzino", 2),
      item("stuffed_chicken", "Prosciutto-Stuffed Chicken"),
      item("porchetta", "Porchetta"),
    ],
    pasta: [
      item("penne_vodka", "Penne Alla Vodka"),
      item("fettuccine_alfredo", "Fettuccine Alfredo"),
      item("lasagna", "Lasagna Bolognese"),
      item("baked_ziti", "Baked Ziti"),
      item("gnocchi", "Gnocchi"),
      item("risotto_milanese", "Risotto Milanese"),
      item("risotto_mushroom", "Mushroom Risotto"),
      item("pasta_primavera", "Pasta Primavera", 0, { dietaryTags: ["vegetarian"] }),
    ],
    side: [
      item("garlic_bread", "Garlic Bread"),
      item("focaccia", "Rosemary Focaccia"),
      item("roasted_vegetables", "Roasted Vegetables"),
      item("mashed_potatoes", "Mashed Potatoes"),
      item("sauteed_broccolini", "Sautéed Broccolini"),
      item("caponata", "Caponata"),
      item("polenta", "Creamy Polenta"),
      item("roasted_fennel", "Roasted Fennel"),
    ],
    salad: [
      item("caesar", "Caesar Salad"),
      item("caprese", "Caprese Salad"),
      item("arugula_pear", "Arugula & Pear Salad"),
      item("antipasto", "Antipasto Salad"),
      item("panzanella", "Panzanella"),
      item("insalata_mista", "Insalata Mista"),
      item("chopped_italian", "Chopped Italian Salad"),
      item("tricolore", "Tricolore"),
      item("tuscan_kale", "Tuscan Kale Salad"),
    ],
  },
};

// ====================
// VEGAN MENU
// ====================
const vegan = {
  name: "Vegan Menu",
  description: "Plant-based dishes packed with flavor and creativity.",
  type: "standard",
  event_type: "other",
  theme_key: "vegan",
  display_order: 6,
  display_on_customer_form: true,
  is_publicly_visible: true,
  recipes: [],
  packages: [
    { tierKey: "bronze", tierName: "Bronze", pricePerPersonCents: 3400, description: "3 mains, 3 sides, 2 salads", displayOrder: 1, minGuestCount: 50, selectionLimits: { protein: 3, side: 3, salad: 2 } },
    { tierKey: "silver", tierName: "Silver", pricePerPersonCents: 4000, description: "4 mains, 4 sides, 3 salads", displayOrder: 2, selectionLimits: { protein: 4, side: 4, salad: 3 } },
    { tierKey: "gold", tierName: "Gold", pricePerPersonCents: 4600, description: "5 mains, 5 sides, 3 salads", displayOrder: 3, selectionLimits: { protein: 5, side: 5, salad: 3 } },
    { tierKey: "diamond", tierName: "Diamond", pricePerPersonCents: 5400, description: "6 mains, 6 sides, 4 salads", displayOrder: 4, selectionLimits: { protein: 6, side: 6, salad: 4 } },
  ],
  category_items: {
    protein: [
      item("jackfruit_bbq", "BBQ Jackfruit", 0, { dietaryTags: ["vegan", "vegetarian"] }),
      item("tofu_scramble", "Tofu Scramble", 0, { dietaryTags: ["vegan", "vegetarian"] }),
      item("seitan_steak", "Seitan Steak", 0, { dietaryTags: ["vegan", "vegetarian"] }),
      item("beyond_burger", "Beyond Burger Patties", 1, { dietaryTags: ["vegan", "vegetarian"] }),
      item("grilled_tempeh", "Grilled Tempeh", 0, { dietaryTags: ["vegan", "vegetarian"] }),
      item("chickpea_curry", "Chickpea Curry", 0, { dietaryTags: ["vegan", "vegetarian"] }),
      item("lentil_loaf", "Lentil Loaf", 0, { dietaryTags: ["vegan", "vegetarian"] }),
      item("stuffed_portobello", "Stuffed Portobello", 0, { dietaryTags: ["vegan", "vegetarian"] }),
      item("eggplant_parmesan", "Vegan Eggplant Parmesan", 0, { dietaryTags: ["vegan", "vegetarian"] }),
      item("cauliflower_steaks", "Grilled Cauliflower Steaks", 0, { dietaryTags: ["vegan", "vegetarian"] }),
      item("vegan_meatballs", "Plant-Based Meatballs", 0, { dietaryTags: ["vegan", "vegetarian"] }),
    ],
    side: [
      item("roasted_root_veggies", "Roasted Root Vegetables", 0, { dietaryTags: ["vegan"] }),
      item("quinoa_pilaf", "Quinoa Pilaf", 0, { dietaryTags: ["vegan", "gluten_free"] }),
      item("wild_rice", "Wild Rice", 0, { dietaryTags: ["vegan", "gluten_free"] }),
      item("mashed_cauliflower", "Mashed Cauliflower", 0, { dietaryTags: ["vegan"] }),
      item("grilled_asparagus", "Grilled Asparagus", 0, { dietaryTags: ["vegan"] }),
      item("ratatouille", "Ratatouille", 0, { dietaryTags: ["vegan"] }),
      item("stuffed_peppers", "Stuffed Bell Peppers", 0, { dietaryTags: ["vegan"] }),
      item("vegan_mac", "Vegan Mac & Cheese", 0, { dietaryTags: ["vegan"] }),
      item("sauteed_greens", "Sautéed Mixed Greens", 0, { dietaryTags: ["vegan"] }),
      item("herb_polenta", "Herb Polenta", 0, { dietaryTags: ["vegan"] }),
      item("roasted_brussels", "Roasted Brussels Sprouts", 0, { dietaryTags: ["vegan"] }),
      item("glazed_carrots", "Maple Glazed Carrots", 0, { dietaryTags: ["vegan"] }),
      item("vegan_stuffing", "Herbed Vegan Stuffing", 0, { dietaryTags: ["vegan"] }),
      item("sweet_potato_casserole", "Sweet Potato Casserole", 0, { dietaryTags: ["vegan"] }),
      item("grilled_veggie_medley", "Grilled Vegetable Medley", 0, { dietaryTags: ["vegan"] }),
    ],
    salad: [
      item("mixed_greens", "Mixed Greens Salad"),
      item("quinoa_tabbouleh", "Quinoa Tabbouleh"),
      item("kale_caesar", "Kale Caesar (Vegan)"),
      item("thai_crunch", "Thai Crunch Salad"),
      item("beet_citrus", "Beet & Citrus Salad"),
      item("mediterranean_chickpea", "Mediterranean Chickpea Salad"),
      item("apple_walnut", "Apple Walnut Salad"),
      item("fruit_salad", "Fresh Fruit Salad"),
      item("grain_bowl", "Grain Bowl Salad"),
    ],
  },
};

const allMenus = [tacoFiesta, americanBBQ, greece, kebab, italy, vegan];

try {
  let created = 0;
  let updated = 0;

  for (const menu of allMenus) {
    // Check if it already exists by theme_key
    const { rows: existing } = await client.query(
      'SELECT id FROM menus WHERE theme_key = $1',
      [menu.theme_key]
    );

    if (existing.length === 0) {
      await client.query(
        `INSERT INTO menus (name, description, type, event_type, theme_key, display_order, display_on_customer_form, is_publicly_visible, recipes, packages, category_items)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          menu.name, menu.description, menu.type, menu.event_type, menu.theme_key,
          menu.display_order, menu.display_on_customer_form, menu.is_publicly_visible,
          JSON.stringify(menu.recipes), JSON.stringify(menu.packages), JSON.stringify(menu.category_items),
        ]
      );
      created++;
      console.log(`✓ Created: ${menu.name}`);
    } else {
      await client.query(
        `UPDATE menus SET
          name = $1, description = $2, display_order = $3,
          display_on_customer_form = $4, packages = $5, category_items = $6,
          updated_at = NOW()
         WHERE theme_key = $7`,
        [
          menu.name, menu.description, menu.display_order,
          menu.display_on_customer_form, JSON.stringify(menu.packages),
          JSON.stringify(menu.category_items), menu.theme_key,
        ]
      );
      updated++;
      console.log(`✓ Updated: ${menu.name}`);
    }
  }

  console.log(`\n✓ Seed complete: ${created} created, ${updated} updated`);

  // Quick verification
  const { rows: verified } = await client.query(`
    SELECT name, theme_key, jsonb_array_length(packages) as tier_count,
           jsonb_object_keys(category_items) as category
    FROM menus
    WHERE theme_key IS NOT NULL
    ORDER BY display_order
  `);
  console.log('\nMenu summary:');
  const byName = {};
  for (const row of verified) {
    if (!byName[row.name]) byName[row.name] = { theme_key: row.theme_key, tier_count: row.tier_count, categories: [] };
    byName[row.name].categories.push(row.category);
  }
  for (const [name, data] of Object.entries(byName)) {
    console.log(`  ${name} [${data.theme_key}] — ${data.tier_count} tiers, categories: ${data.categories.join(', ')}`);
  }
} catch (err) {
  console.error('Seed failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
