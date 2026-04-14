import { Link } from "wouter";
import {
  BookOpen,
  ShoppingBasket,
  ChefHat,
  Scale,
  Package,
  Lightbulb,
  AlertTriangle,
  Sparkles,
  ClipboardList,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Chef-facing help page. Plain kitchen language — no tech jargon.
// Walks Mike through the ingredient → recipe → shopping list flow and
// explains the cup-to-pound, pack-size, and trim-yield features.

export default function KitchenHelpPage() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl" data-testid="page-kitchen-help">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="p-3 bg-primary/10 rounded-lg">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">
              Kitchen Help
            </h1>
            <p className="text-muted-foreground mt-1">
              How to use the ingredient &amp; recipe tools without pulling
              your hair out.
            </p>
          </div>
        </div>

        {/* Welcome card */}
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-primary" />
              The short version
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <p>
              You buy ingredients one way — by the <strong>pound</strong>,
              the <strong>case</strong>, the <strong>gallon</strong>. You
              cook with a different way — <strong>cups</strong>,{" "}
              <strong>tablespoons</strong>, <strong>ounces</strong>. This
              system handles the math in between so you always know{" "}
              <em>how much to order</em> and <em>what the plate costs</em>.
            </p>
            <p>
              Three things make it work:
            </p>
            <ol className="list-decimal list-inside space-y-1 pl-2">
              <li>
                <strong>Base Ingredients</strong> — the master list of
                everything you buy, with your supplier price.
              </li>
              <li>
                <strong>Recipes</strong> — the way you actually cook,
                written in cups, spoons, pieces.
              </li>
              <li>
                <strong>Shopping List</strong> — the system does the
                converting and tells you exactly what to buy for each
                event.
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Quick links */}
        <div className="grid gap-3 md:grid-cols-2">
          <Link href="/base-ingredients">
            <Card className="hover:shadow-md transition-shadow cursor-pointer" data-testid="link-base-ingredients">
              <CardContent className="pt-6 flex items-center gap-3">
                <ShoppingBasket className="h-6 w-6 text-primary" />
                <div className="flex-1">
                  <div className="font-semibold">Go to Base Ingredients</div>
                  <div className="text-xs text-muted-foreground">
                    Add / update what you buy
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/recipes">
            <Card className="hover:shadow-md transition-shadow cursor-pointer" data-testid="link-recipes">
              <CardContent className="pt-6 flex items-center gap-3">
                <ChefHat className="h-6 w-6 text-primary" />
                <div className="flex-1">
                  <div className="font-semibold">Go to Recipes</div>
                  <div className="text-xs text-muted-foreground">
                    Build or edit a recipe
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Section: Adding a new ingredient */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBasket className="h-5 w-5 text-primary" />
              1. Adding something you just bought
            </CardTitle>
            <CardDescription>
              Example: you pick up a 5&nbsp;lb bag of all-purpose flour for
              $4.20.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>Open <strong>Base Ingredients</strong> and click <strong>Add Ingredient</strong>. Fill it in the way you actually bought it:</p>
            <div className="rounded-md border bg-muted/30 p-4 space-y-1.5">
              <div><strong>Name:</strong> All-Purpose Flour</div>
              <div><strong>Category:</strong> Dry Goods &amp; Grains</div>
              <div><strong>Purchase price:</strong> $4.20</div>
              <div><strong>Quantity:</strong> 5</div>
              <div><strong>Unit:</strong> Pound</div>
              <div><strong>Supplier:</strong> Restaurant Depot (optional)</div>
            </div>
            <div className="rounded-md border border-violet-300 bg-violet-50 dark:bg-violet-950/40 p-4">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-violet-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-violet-900 dark:text-violet-200">
                    You&rsquo;ll see a purple box appear
                  </p>
                  <p className="text-violet-800 dark:text-violet-300 mt-1">
                    The system recognized &ldquo;all-purpose flour&rdquo;
                    and already knows that <strong>1 cup = ~0.28 lb</strong>,{" "}
                    <strong>1 tbsp = ~0.017 lb</strong>, and so on. That
                    means from this moment on, any recipe that asks for
                    &ldquo;2 cups flour&rdquo; will automatically know to
                    put ~0.55 lb on your shopping list.
                  </p>
                  <p className="text-violet-800 dark:text-violet-300 mt-2">
                    Just hit <strong>Save</strong>. You don&rsquo;t need to
                    type anything else.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-muted-foreground italic">
              Works automatically for around 130 common ingredients — flours,
              sugars, oils, dairy, produce, spices, nuts. For anything
              unusual (like a house-made demi-glace), see section 5.
            </p>
          </CardContent>
        </Card>

        {/* Section: Building a recipe */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-primary" />
              2. Building a recipe — cook the way you cook
            </CardTitle>
            <CardDescription>
              Type ingredients in whatever unit feels natural. The system
              translates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              Open <strong>Recipes</strong>, click <strong>New Recipe</strong>, name it, set how many portions
              one batch makes (that&rsquo;s the <strong>Yield</strong>),
              then add the ingredients the way you write them on a card:
            </p>
            <div className="rounded-md border bg-muted/30 p-4 space-y-2 font-mono text-xs">
              <div>2 cups all-purpose flour</div>
              <div>1 tbsp kosher salt</div>
              <div>4 each large eggs</div>
              <div>1.5 lb yellow onion, diced</div>
              <div>0.5 cup olive oil</div>
            </div>
            <p>
              Cups, tablespoons, pounds, eggs by the piece — all of it is
              fine. As you add each line, the{" "}
              <strong>Buy / Per Person</strong> column shows you two things:
            </p>
            <ul className="list-disc list-inside pl-2 space-y-1 text-muted-foreground">
              <li>
                <span className="text-foreground">
                  How much you&rsquo;ll actually buy
                </span>{" "}
                — e.g. &ldquo;0.55 lb total&rdquo; for the flour.
              </li>
              <li>
                <span className="text-foreground">How many grams per guest</span>{" "}
                — a sanity check on your portioning.
              </li>
            </ul>
            <p>
              The cost column at the right adds up as you go. If you change
              a quantity, everything recalculates live.
            </p>
          </CardContent>
        </Card>

        {/* Section: Trim and yield */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              3. &ldquo;Why is my shopping list showing more than the recipe
              needs?&rdquo;
            </CardTitle>
            <CardDescription>
              Because peels, skins, and pits are real.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              When your recipe says &ldquo;<strong>1 lb diced onion</strong>&rdquo;,
              that&rsquo;s the weight <em>after</em> you&rsquo;ve peeled and
              trimmed. But the store sells you whole onions, skin and all.
              So you actually need to buy a little more.
            </p>
            <p>
              This system knows that for common produce. If you look at the
              recipe builder and see a little badge like{" "}
              <Badge variant="outline" className="text-[10px]">
                yield 90%
              </Badge>{" "}
              next to an ingredient, that means the system is already
              adding ~10% to cover peel/core/trim. No math on your end.
            </p>
            <div className="rounded-md border bg-muted/30 p-4">
              <div className="text-xs text-muted-foreground mb-1">
                Example
              </div>
              <div>
                Recipe calls for <strong>1 lb diced onion</strong>, onion
                yield is 90% → shopping list buys{" "}
                <strong>~1.11 lb whole onion</strong>. That&rsquo;s ~2
                medium onions.
              </div>
            </div>
            <p className="text-muted-foreground">
              Yield defaults come pre-loaded for produce. You can edit the
              number on any Base Ingredient if you want (e.g. bone-in
              chicken might be 60–65% depending on your cuts). Leave it
              blank if there&rsquo;s no waste.
            </p>
          </CardContent>
        </Card>

        {/* Section: Pack sizes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              4. Tracking the real sizes your supplier carries
            </CardTitle>
            <CardDescription>
              5 lb bag, 25 lb sack, 50 lb case — all at once.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Real life: the same flour comes in three sizes. The 5&nbsp;lb
              bag is quick, the 25&nbsp;lb sack is cheaper per pound, the
              50&nbsp;lb case is even cheaper but you need to use it up.
            </p>
            <p>
              Each Base Ingredient can have multiple <strong>Pack Sizes</strong>. When the shopping list needs 7 lb of flour, it&rsquo;ll
              figure out the cheapest mix that covers it — for example:
            </p>
            <div className="rounded-md border bg-muted/30 p-4 font-mono text-xs">
              <div>Needs: 7 lb flour</div>
              <div className="text-muted-foreground">
                Plan: 1 × 5 lb bag ($4.20) + 2 × 1 lb bag ($1.80) = 7 lb · $6.00
              </div>
            </div>
            <p className="text-muted-foreground">
              Don&rsquo;t have multiple sizes to worry about? Don&rsquo;t
              set any — the system uses your default purchase price and
              moves on. Only add extra pack sizes when they actually help
              you save money.
            </p>
          </CardContent>
        </Card>

        {/* Section: Fixing conversions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              5. &ldquo;It says &lsquo;Needs conversion&rsquo; — what do I
              do?&rdquo;
            </CardTitle>
            <CardDescription>
              Happens with house-made items or unusual ingredients.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              If the recipe builder shows an amber{" "}
              <strong>&ldquo;Needs conversion&rdquo;</strong> warning on a
              line, that means the system can&rsquo;t figure out on its own
              how to turn your recipe unit (say, <em>cups</em>) into your
              purchase unit (say, <em>pounds</em>) for that specific
              ingredient.
            </p>
            <p>
              Two ways to fix it, in order of laziness:
            </p>
            <ol className="list-decimal list-inside pl-2 space-y-2">
              <li>
                <strong>Weigh one cup of it, once.</strong> Put a cup of
                the stuff on a scale. Note the weight. Go to that Base
                Ingredient, tell the system &ldquo;1 cup = X lb&rdquo; and
                save. Every recipe from now on will use that number.
              </li>
              <li>
                <strong>Or, just use the same unit in the recipe as on the
                bag.</strong> If you buy by the pound, write the recipe in
                pounds (e.g. <em>0.25 lb</em> instead of <em>1 cup</em>).
                Less elegant but it always works.
              </li>
            </ol>
            <p className="text-muted-foreground italic">
              This usually only comes up for stuff you prepare
              in-house like pestos, base sauces, or specialty spice
              blends.
            </p>
          </CardContent>
        </Card>

        {/* Section: Shopping list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              6. The shopping list for an event
            </CardTitle>
            <CardDescription>
              This is where it all pays off.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Once you&rsquo;ve built your recipes and linked them to menu
              items, pulling up a shopping list is automatic. For any quote
              or event, the system will:
            </p>
            <ul className="list-disc list-inside pl-2 space-y-1">
              <li>
                Scale every recipe to the guest count (with a sensible
                multiplier depending on whether it&rsquo;s plated,
                buffet, or cocktail).
              </li>
              <li>Add up every ingredient across every dish.</li>
              <li>
                Convert everything to the form you buy it in (pounds,
                cases, gallons).
              </li>
              <li>Adjust for trim/yield where it matters.</li>
              <li>
                Suggest which pack sizes to grab if you&rsquo;ve set them
                up.
              </li>
              <li>Group the list by category (meat, produce, dairy…).</li>
              <li>Total up the ingredient cost + labor hours.</li>
            </ul>
            <p>
              You walk into Restaurant Depot with that list and check
              things off.
            </p>
          </CardContent>
        </Card>

        {/* FAQ / troubleshooting accordion */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              Quick answers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="faq-1">
                <AccordionTrigger className="text-sm">
                  Do I have to set up every single ingredient from scratch?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  No. The common ones — flour, sugar, butter, oil, onions,
                  eggs, most dairy and produce — already know their
                  conversions. You just type the name, hit save, and go.
                  Only house-made or unusual items need a one-time
                  &ldquo;weigh a cup&rdquo; step.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-2">
                <AccordionTrigger className="text-sm">
                  My supplier raised the price. How do I update it?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Go to Base Ingredients, click the pencil icon next to
                  that item, update the price, save. Every recipe that
                  uses it will recalculate automatically — and the
                  Ingredients page shows you a red &ldquo;price change&rdquo;
                  arrow for a few days so you know what jumped.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-3">
                <AccordionTrigger className="text-sm">
                  The shopping list is showing an ingredient I didn&rsquo;t expect.
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  That means a menu item is linked to a recipe that
                  uses it. Open the recipe (Recipes page → click the row)
                  and check the ingredient list. If something&rsquo;s
                  wrong, edit the recipe. Everything on the shopping list
                  comes from somewhere on a recipe card.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-4">
                <AccordionTrigger className="text-sm">
                  I have 300+ ingredients already — do I have to redo them all?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  No. On the Base Ingredients page there&rsquo;s an{" "}
                  <strong>&ldquo;Auto-fill conversions&rdquo;</strong>{" "}
                  button at the top. Click it once. It goes through every
                  ingredient and fills in the common-sense conversions for
                  anything it recognizes. You can keep working while it
                  runs.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-5">
                <AccordionTrigger className="text-sm">
                  What&rsquo;s the difference between a recipe yield and an
                  ingredient yield?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  <strong>Recipe yield</strong> = how many portions one
                  batch makes. Example: your brisket recipe feeds 10.{" "}
                  <strong>Ingredient yield</strong> = how much of a raw
                  ingredient survives the trim. Example: a whole onion is
                  only ~90% usable once you peel and root it. Both feed
                  into the shopping list so you&rsquo;re not short on
                  event day.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-6">
                <AccordionTrigger className="text-sm">
                  I buy by the case of 6 bottles. Can the system handle that?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Yes. Add a Pack Size with unit &ldquo;case&rdquo; or
                  &ldquo;bottle&rdquo; and set the minimum order to 1.
                  The shopping list will round up to whole cases when
                  it plans the order. If a supplier forces a minimum of 2
                  cases, set the minimum order to 2.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-7">
                <AccordionTrigger className="text-sm">
                  Does entering &ldquo;tbls&rdquo; or &ldquo;Tbsp&rdquo; or
                  &ldquo;tablespoon&rdquo; matter?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  No. The system understands the common abbreviations and
                  typos — lb / lbs / pound / pounds all mean the same
                  thing, same for tsp / tsps / teaspoon. Type whichever
                  way feels fastest.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Footer note */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            <p>
              Still stuck? Shout &mdash; someone from the ops team can walk
              through it with you. The goal is that you never have to
              punch conversion factors into a calculator again. You cook.
              The system does the math.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
