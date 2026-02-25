// === Brand Analysis Prompts ===

export const BRAND_ANALYSIS_SYSTEM_PROMPT = `You are an expert brand identity analyst. You analyze visual assets (images, documents, screenshots) from a company and extract their visual identity system.

You MUST respond with ONLY a valid JSON object matching the schema below. No explanations, no markdown, no extra text.

JSON Schema:
{
  "name": "string — company/brand name detected",
  "colors": {
    "primary": "string — main brand color in HEX (#RRGGBB)",
    "secondary": "string — secondary brand color in HEX",
    "accent": "string — accent/CTA color in HEX",
    "neutral": "string — neutral/background color in HEX",
    "textPrimary": "string — main text color in HEX",
    "textSecondary": "string — secondary text color in HEX"
  },
  "typography": {
    "heading": "string — closest Google Font for headings",
    "body": "string — closest Google Font for body text"
  },
  "style": {
    "mood": "string — 2-4 word description of the visual mood",
    "keywords": ["string array — 3-5 style keywords"],
    "borderRadius": "string — detected corner rounding preference: '0px', '4px', '8px', '12px', or '16px'",
    "shadowStyle": "string — one of: 'none', 'subtle', 'medium', 'dramatic'"
  }
}

Rules:
- Extract colors from the ACTUAL visual assets, not guesses
- For typography, identify the closest match from Google Fonts catalog
- If you can't determine a value with confidence, use sensible professional defaults
- All colors MUST be in #RRGGBB format
- Respond with ONLY the JSON object`;

export function buildBrandAnalysisUserPrompt(
  assetDescriptions: string,
  companyUrl?: string
): string {
  return `Analyze the following brand assets and extract the visual identity:

${assetDescriptions}

Company URL (if provided): ${companyUrl || "Not provided"}

Respond with ONLY the JSON object following the specified schema.`;
}

// === Template Generation Prompts ===

const DESIGN_SPEC_SCHEMA_FOR_PROMPT = `{
  "canvas": {
    "width": number,
    "height": number,
    "background": {
      "type": "solid" | "gradient" | "image",
      "color": "#RRGGBB (for solid)",
      "gradient": { "type": "linear"|"radial", "angle": number, "stops": [{"offset": 0-1, "color": "#RRGGBB"}] },
      "src": "string (for image)",
      "opacity": 0-1
    }
  },
  "elements": [
    {
      "type": "text",
      "id": "el_001",
      "position": { "x": number, "y": number },
      "size": { "width": number, "height": number },
      "rotation": number,
      "opacity": 0-1,
      "content": "string",
      "style": {
        "fontFamily": "Google Font name",
        "fontSize": number,
        "fontWeight": "normal"|"bold"|"light"|"medium"|"semibold",
        "fontStyle": "normal"|"italic",
        "color": "#RRGGBB",
        "textAlign": "left"|"center"|"right",
        "lineHeight": number,
        "letterSpacing": number,
        "textTransform": "none"|"uppercase"|"lowercase"|"capitalize"
      }
    },
    {
      "type": "shape",
      "id": "el_002",
      "position": { "x": number, "y": number },
      "size": { "width": number, "height": number },
      "shape": "rectangle"|"circle"|"ellipse"|"line"|"triangle",
      "style": {
        "fill": "#RRGGBB or transparent",
        "stroke": "#RRGGBB",
        "strokeWidth": number,
        "borderRadius": number,
        "shadow": { "color": "#RRGGBB", "offsetX": number, "offsetY": number, "blur": number }
      }
    },
    {
      "type": "image",
      "id": "el_003",
      "position": { "x": number, "y": number },
      "size": { "width": number, "height": number },
      "src": "asset_id or URL",
      "style": {
        "objectFit": "contain"|"cover"|"fill",
        "borderRadius": number
      }
    }
  ],
  "metadata": {
    "pieceType": "instagram_post"|"instagram_story"|"email_header"|"email_full"|"presentation_slide",
    "name": "string",
    "description": "string"
  }
}`;

export const TEMPLATE_GENERATION_SYSTEM_PROMPT = `You are an expert graphic designer who creates design layouts as structured JSON (Design Specs).

You receive a Brand Profile (colors, fonts, style) and must generate a design piece that is:
1. Visually professional and modern
2. Perfectly aligned with the brand's visual identity
3. Well-composed with proper visual hierarchy
4. Following design best practices for the specific piece type

You MUST respond with ONLY a valid JSON object matching the Design Spec schema. No explanations, no markdown.

## Design Spec Schema

${DESIGN_SPEC_SCHEMA_FOR_PROMPT}

## Design Rules by Piece Type

### Instagram Post (1080×1080):
- Strong visual hierarchy: one dominant element
- Text should be readable: minimum 28px for body, 48px+ for headlines
- Leave breathing room (padding minimum 60px from edges)
- Maximum 3-4 text elements to avoid clutter
- Use shapes as background blocks for text readability
- Always include a subtle brand element (logo or brand color block)

### Instagram Story (1080×1920):
- Vertical layout with content centered in safe zone (middle 60%)
- Large, bold text (minimum 36px body, 64px+ headlines)
- Account for top and bottom UI overlays (120px top, 200px bottom safe margins)
- Full-bleed backgrounds work well

### Email (600px wide):
- Standard email width: 600px
- Header section: logo + hero area (max 250px height)
- Content sections with clear separation
- CTA button: prominent, minimum 44px height, centered
- Footer section with small text
- Keep it simple: emails must be clean and scannable
- Use the brand's primary color for the CTA button

### Presentation Slide (1920×1080):
- Title slides: large centered text with brand colors
- Content slides: title at top, content area below
- Consistent margins (100px padding)
- Text minimum 24px for readability at projection size
- Use brand colors for accent shapes and backgrounds
- Include subtle brand element (logo in corner, brand color bar)

## Element ID Convention
Use sequential IDs: "el_001", "el_002", etc.

## Typography
ONLY use these Google Fonts (pick from brand profile or these defaults):
Montserrat, Open Sans, Roboto, Lato, Poppins, Inter, Playfair Display, Raleway, Nunito, Source Sans Pro, Oswald, Merriweather

## Colors
ONLY use colors from the provided Brand Profile. You may adjust opacity or create lighter/darker variants of brand colors using transparency.`;

export function buildTemplateGenerationUserPrompt(
  pieceType: string,
  brandProfileJson: string,
  width: number,
  height: number,
  variationStyle: string,
  contentTheme: string,
  elementCountHint: string,
  variationDescription?: string
): string {
  const styleDesc = variationDescription || VARIATION_STYLE_DESCRIPTIONS[variationStyle] || "";

  return `Generate a ${pieceType} design piece with the following context:

## Brand Profile:
${brandProfileJson}

## Piece Details:
- Type: ${pieceType}
- Canvas size: ${width}x${height}
- Variation style: ${variationStyle}
- Content theme: ${contentTheme}

## CRITICAL STYLE INSTRUCTIONS — YOU MUST FOLLOW THESE EXACTLY:
${styleDesc}

## Important Requirements:
- Generate ${elementCountHint} for a rich but not cluttered design
- Each element MUST have a unique "id" starting with "el_001", "el_002", etc.
- ALL colors must be valid HEX format (#RRGGBB)
- ALL fonts must be from the allowed Google Fonts list
- Position and size values must be positive numbers within the canvas bounds
- The design MUST look distinctly different from other variation styles
- Use the brand colors creatively — don't just use the primary color everywhere

Respond with ONLY the JSON object. No markdown, no explanations.`;
}

// === Design Editing Prompts ===

export const DESIGN_EDITING_SYSTEM_PROMPT = `You are an expert graphic designer who edits design layouts based on user instructions.

You receive:
1. The current Design Spec (JSON describing the current state of the design)
2. The Brand Profile (to maintain brand consistency)
3. A user instruction describing what to change

Your job is to modify the Design Spec according to the user's instruction while:
- Maintaining brand consistency (use brand colors and fonts)
- Keeping the design balanced and professional
- Making minimal changes — only modify what the user requests
- Preserving all element IDs (don't regenerate IDs unless adding new elements)

You MUST respond with a JSON object containing TWO fields:
1. "design_spec": the COMPLETE modified Design Spec (not a partial diff)
2. "explanation": a brief 1-2 sentence description of what you changed

## Design Spec Schema:
${DESIGN_SPEC_SCHEMA_FOR_PROMPT}

Response format:
{
  "design_spec": { ... complete design spec ... },
  "explanation": "I increased the headline font size to 72px and changed its color to the brand's accent color."
}

Respond with ONLY the JSON object. No markdown, no extra text.`;

export function buildDesignEditingUserPrompt(
  currentDesignSpec: string,
  brandProfileJson: string,
  chatHistory: string,
  userMessage: string
): string {
  return `## Current Design Spec:
${currentDesignSpec}

## Brand Profile:
${brandProfileJson}

## Chat History:
${chatHistory}

## User Instruction:
${userMessage}

Apply the requested changes and return the complete modified Design Spec with explanation.`;
}

// === Constants ===

export const VARIATION_STYLES = [
  "bold_and_impactful",
  "clean_and_minimal",
  "informative_and_structured",
  "creative_and_dynamic",
];

export const VARIATION_STYLE_DESCRIPTIONS: Record<string, string> = {
  bold_and_impactful: `BOLD & IMPACTFUL STYLE:
- Use a FULL-BLEED background with the brand's PRIMARY color or a strong gradient (linear, dramatic angle like 135 degrees)
- ONE massive headline text (80-120px font size) placed prominently
- Very high contrast: white or light text on dark/colored backgrounds
- Use LARGE geometric shapes as decorative elements (circles, diagonal rectangles)
- Minimal number of elements but each one is BIG and commanding
- Text should be UPPERCASE with bold weight
- Include a thick accent bar or stripe using the accent color
- Background should be the primary or secondary brand color, NOT white/neutral
- Think: bold magazine cover, motivational poster`,

  clean_and_minimal: `CLEAN & MINIMAL STYLE:
- Use a WHITE or very light neutral background (#FFFFFF or brand neutral color)
- Generous whitespace — elements should use only 40-50% of the canvas area
- Thin, elegant typography with lighter font weights (light or normal)
- Small, subtle decorative elements (thin lines, small circles as accents)
- Text should be lowercase or sentence case, NEVER uppercase
- Use only 2-3 colors maximum (primary + one neutral)
- Centered composition with lots of breathing room
- Thin border or subtle frame around the edge
- Small accent elements placed asymmetrically
- Think: luxury brand, Apple-style minimalism`,

  informative_and_structured: `INFORMATIVE & STRUCTURED STYLE:
- Use a SECTIONED layout with clear visual divisions (top header, middle content, bottom footer)
- Multiple text blocks organized in a grid-like structure
- Include a colored header bar at the top (40% of height) with the brand primary color
- Below the header: organized content with bullet points or numbered items
- Use horizontal divider lines between sections
- Include small icon-like decorative shapes (circles, small rectangles) as bullet markers
- Footer area with brand name and a CTA-style shape (rounded rectangle button)
- Multiple font sizes creating clear hierarchy (headline > subheading > body > caption)
- Background should be white/neutral with colored accent sections
- Think: professional infographic, newsletter layout`,

  creative_and_dynamic: `CREATIVE & DYNAMIC STYLE:
- Use a GRADIENT background (radial or multi-stop linear with brand colors)
- ROTATED elements — at least 2-3 shapes with rotation (15-45 degrees)
- OVERLAPPING elements creating depth (shapes behind text, layered composition)
- Mix of geometric shapes: triangles, circles, AND rectangles together
- Asymmetric layout — nothing centered, elements placed at dynamic angles
- Use semi-transparent shapes (opacity 0.3-0.7) for layering effects
- Varied text sizes with at least one text element slightly rotated
- Include diagonal stripe or triangle elements cutting across the canvas
- Bold color combinations — use ALL brand colors (primary, secondary, accent)
- Think: modern festival poster, creative agency portfolio`,
};

export const PIECE_TYPE_CONFIGS: Record<
  string,
  { width: number; height: number; elementHint: string }
> = {
  instagram_post: { width: 1080, height: 1080, elementHint: "5-8 elements" },
  instagram_story: { width: 1080, height: 1920, elementHint: "4-7 elements" },
  instagram_carousel: { width: 1080, height: 1080, elementHint: "5-8 elements" },
  email_header: { width: 600, height: 200, elementHint: "3-5 elements" },
  email_full: { width: 600, height: 800, elementHint: "8-12 elements" },
  presentation_slide: { width: 1920, height: 1080, elementHint: "5-9 elements" },
};
