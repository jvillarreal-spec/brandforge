export function extractJsonFromResponse(text: string): any {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // noop
  }

  // Try to extract JSON from markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // noop
    }
  }

  // Try to find JSON object in the text
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // noop
    }
  }

  throw new Error("Could not extract valid JSON from AI response");
}

const ALLOWED_FONTS = [
  "Montserrat",
  "Open Sans",
  "Roboto",
  "Lato",
  "Poppins",
  "Inter",
  "Playfair Display",
  "Raleway",
  "Nunito",
  "Source Sans Pro",
  "Oswald",
  "Merriweather",
];

const HEX_REGEX = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

function isValidHex(color: string): boolean {
  return HEX_REGEX.test(color);
}

export function validateDesignSpec(spec: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!spec || typeof spec !== "object") {
    return { valid: false, errors: ["Design spec must be an object"] };
  }

  // Validate canvas
  if (!spec.canvas) {
    errors.push("Missing canvas configuration");
  } else {
    if (typeof spec.canvas.width !== "number" || spec.canvas.width <= 0) {
      errors.push("Canvas width must be a positive number");
    }
    if (typeof spec.canvas.height !== "number" || spec.canvas.height <= 0) {
      errors.push("Canvas height must be a positive number");
    }
    if (!spec.canvas.background) {
      errors.push("Missing canvas background");
    } else if (spec.canvas.background.type === "solid" && !isValidHex(spec.canvas.background.color || "")) {
      errors.push(`Invalid background color: ${spec.canvas.background.color}`);
    }
  }

  // Validate elements
  if (!Array.isArray(spec.elements)) {
    errors.push("Elements must be an array");
  } else {
    const ids = new Set<string>();
    for (const el of spec.elements) {
      if (!el.id) {
        errors.push("Element missing id");
      } else if (ids.has(el.id)) {
        errors.push(`Duplicate element id: ${el.id}`);
      } else {
        ids.add(el.id);
      }

      if (!el.type || !["text", "image", "shape", "group"].includes(el.type)) {
        errors.push(`Invalid element type: ${el.type}`);
      }

      if (el.type === "text") {
        if (!el.content) errors.push(`Text element ${el.id} missing content`);
        if (el.style?.fontFamily && !ALLOWED_FONTS.includes(el.style.fontFamily)) {
          errors.push(`Invalid font: ${el.style.fontFamily}. Must be one of: ${ALLOWED_FONTS.join(", ")}`);
        }
        if (el.style?.color && !isValidHex(el.style.color)) {
          errors.push(`Invalid text color in ${el.id}: ${el.style.color}`);
        }
      }

      if (el.type === "shape") {
        if (el.style?.fill && el.style.fill !== "transparent" && !isValidHex(el.style.fill)) {
          errors.push(`Invalid fill color in ${el.id}: ${el.style.fill}`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateDesignEditResponse(response: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!response || typeof response !== "object") {
    return { valid: false, errors: ["Response must be an object"] };
  }

  if (!response.design_spec) {
    errors.push("Missing design_spec field");
  } else {
    const specValidation = validateDesignSpec(response.design_spec);
    errors.push(...specValidation.errors);
  }

  if (!response.explanation || typeof response.explanation !== "string") {
    errors.push("Missing or invalid explanation field");
  }

  return { valid: errors.length === 0, errors };
}
