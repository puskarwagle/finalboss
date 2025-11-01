# Resume Templates Implementation Plan
## 12 Distinct ATS-Friendly Templates

### Overview
Create 12 unique resume templates (3 per category) with distinct visual designs including:
- Different color schemes (headers, accents, dividers)
- Different font families and typography
- Different layouts and spacing
- All maintaining ATS compatibility

---

## Template Design Specifications

### Category 1: Traditional (3 templates)

#### Template T1: Classic Blue
- **Colors**: 
  - Header: Deep Blue (#1a365d)
  - Accents: Medium Blue (#2d5aa0)
  - Dividers: Light Gray (#e5e7eb)
- **Fonts**: 
  - Headers: Georgia (serif)
  - Body: Times New Roman (serif)
  - Contact: Arial (sans-serif)
- **Layout**: Centered header, left-aligned content, traditional spacing
- **Special**: Section headers with blue underline

#### Template T2: Professional Navy
- **Colors**:
  - Header: Navy Blue (#1e3a5f)
  - Accents: Teal (#0f766e)
  - Dividers: Navy with thin line
- **Fonts**:
  - Headers: Garamond (serif)
  - Body: Book Antiqua (serif)
  - Contact: Calibri (sans-serif)
- **Layout**: Centered header, justified text, compact spacing
- **Special**: Two-column header layout (name left, contact right)

#### Template T3: Timeless Black
- **Colors**:
  - Header: Pure Black (#000000)
  - Accents: Dark Gray (#4b5563)
  - Dividers: Medium Gray line
- **Fonts**:
  - Headers: Palatino Linotype (serif)
  - Body: Cambria (serif)
  - Contact: Verdana (sans-serif)
- **Layout**: Fully left-aligned, traditional corporate format
- **Special**: Bold section headers with black background bars

---

### Category 2: Professional (3 templates)

#### Template P1: Corporate Green
- **Colors**:
  - Header: Forest Green (#065f46)
  - Accents: Emerald (#10b981)
  - Dividers: Green-tinted gray
- **Fonts**:
  - Headers: Trebuchet MS (sans-serif)
  - Body: Segoe UI (sans-serif)
  - Contact: Arial Narrow
- **Layout**: Left-aligned header with green accent bar, structured sections
- **Special**: Green horizontal rule under header

#### Template P2: Executive Gray
- **Colors**:
  - Header: Charcoal (#374151)
  - Accents: Slate Blue (#475569)
  - Dividers: Gradient gray lines
- **Fonts**:
  - Headers: Franklin Gothic Medium (sans-serif)
  - Body: Century Gothic (sans-serif)
  - Contact: Tahoma
- **Layout**: Centered header, two-column skills layout
- **Special**: Gray sidebar for skills section

#### Template P3: Business Blue
- **Colors**:
  - Header: Professional Blue (#1e40af)
  - Accents: Sky Blue (#0ea5e9)
  - Dividers: Blue tinted lines
- **Fonts**:
  - Headers: Arial Black (sans-serif)
  - Body: Helvetica (sans-serif)
  - Contact: Lucida Sans
- **Layout**: Header with blue background box, left-aligned content
- **Special**: Blue accent boxes for section headers

---

### Category 3: Clean (3 templates)

#### Template C1: Minimalist White
- **Colors**:
  - Header: Dark Gray (#111827)
  - Accents: Light Gray (#9ca3af)
  - Dividers: Thin gray lines
- **Fonts**:
  - Headers: Open Sans (sans-serif) - Bold
  - Body: Lato (sans-serif) - Regular
  - Contact: Roboto (sans-serif) - Light
- **Layout**: Maximum white space, minimal borders
- **Special**: Ultra-thin dividers, generous spacing

#### Template C2: Modern Minimal
- **Colors**:
  - Header: Charcoal (#1f2937)
  - Accents: Soft Blue (#93c5fd)
  - Dividers: Dotted gray lines
- **Fonts**:
  - Headers: Montserrat (sans-serif)
  - Body: Source Sans Pro (sans-serif)
  - Contact: Inter (sans-serif)
- **Layout**: Asymmetric spacing, modern grid
- **Special**: Bullet points with blue dots

#### Template C3: Clean Serif
- **Colors**:
  - Header: Almost Black (#0f172a)
  - Accents: Slate (#64748b)
  - Dividers: Subtle gray
- **Fonts**:
  - Headers: Merriweather (serif) - Bold
  - Body: Lora (serif) - Regular
  - Contact: Work Sans (sans-serif)
- **Layout**: Clean serif typography, spacious
- **Special**: Elegant serif headers with subtle styling

---

### Category 4: Modern (3 templates)

#### Template M1: Tech Modern
- **Colors**:
  - Header: Deep Purple (#5b21b6)
  - Accents: Purple (#a855f7)
  - Dividers: Purple gradient lines
- **Fonts**:
  - Headers: Raleway (sans-serif) - Extra Bold
  - Body: Poppins (sans-serif) - Regular
  - Contact: Nunito (sans-serif)
- **Layout**: Modern asymmetric, tech-forward
- **Special**: Purple accent bars, modern icons (if applicable)

#### Template M2: Creative Bold
- **Colors**:
  - Header: Coral Red (#dc2626)
  - Accents: Orange (#f97316)
  - Dividers: Bold colored lines
- **Fonts**:
  - Headers: Bebas Neue (sans-serif) - Condensed
  - Body: Roboto Condensed (sans-serif)
  - Contact: Oswald (sans-serif)
- **Layout**: Bold headers, creative spacing
- **Special**: Red accent strips, bold typography

#### Template M3: Sleek Dark
- **Colors**:
  - Header: Dark Slate (#1e293b)
  - Accents: Cyan (#06b6d4)
  - Dividers: Cyan lines on dark
- **Fonts**:
  - Headers: DM Sans (sans-serif) - Bold
  - Body: Inter (sans-serif) - Regular
  - Contact: Space Grotesk (sans-serif)
- **Layout**: Modern grid, sleek spacing
- **Special**: Cyan accents, contemporary feel

---

## Technical Implementation Plan

### Phase 1: Extend Template System

#### 1.1 Update Template Types (`src/lib/resume/types.ts`)
```typescript
interface TemplateStyle {
  // Colors
  primaryColor: string;      // Header/main accent
  secondaryColor: string;     // Secondary accents
  dividerColor: string;       // Section dividers
  textColor: string;          // Main text
  backgroundColor?: string;   // Background (for DOCX)
  
  // Fonts
  headerFont: string;
  bodyFont: string;
  contactFont: string;
  
  // Typography
  headerFontSize: number;
  bodyFontSize: number;
  contactFontSize: number;
  headerFontWeight: string;
  
  // Layout
  headerAlignment: 'left' | 'center' | 'right';
  contentAlignment: 'left' | 'center' | 'justified';
  sectionSpacing: number;
  
  // Special Features
  headerStyle: 'plain' | 'underline' | 'background' | 'border';
  dividerStyle: 'line' | 'dotted' | 'gradient' | 'none';
  showAccentBars: boolean;
}
```

#### 1.2 Extend TemplateMetadata
Add `style: TemplateStyle` to each template definition.

---

### Phase 2: Create Template Definitions

#### 2.1 Create Template Config File (`src/lib/resume/templates/configs.ts`)
- Define all 12 template configurations
- Export template style objects
- Organize by category

#### 2.2 Update Template Registry (`src/lib/resume/templates/index.ts`)
- Add 12 templates with unique IDs
- Link each to its style config
- Update template metadata

---

### Phase 3: Update DOCX Generator

#### 3.1 Add Template Style Support (`src/lib/resume/generator.ts`)
- Create `getTemplateStyle()` helper
- Update `generateHeader()` to use template colors/fonts
- Update all section generators with template-aware styling
- Apply colors using `color` property in TextRun
- Apply fonts using `font` property
- Apply layout using AlignmentType and spacing

#### 3.2 Template-Specific Functions
- `generateStyledHeader()` - Apply template header styling
- `generateStyledSection()` - Apply template section styling
- `generateStyledDivider()` - Apply template divider styling

---

### Phase 4: Update WYSIWYG Editor

#### 4.1 Template-Aware Styling (`src/routes/resume-builder/edit/[id]/+page.svelte`)
- Load template style on mount
- Apply inline styles based on template
- Update CSS classes dynamically
- Show different colors/fonts in editor

#### 4.2 Dynamic Style Application
- Use Svelte `style:` directives
- Apply template colors to headers
- Apply template fonts via CSS variables or inline styles
- Update section dividers based on template

---

### Phase 5: Font Handling

#### 5.1 Web Fonts
- Import Google Fonts or use system fonts
- Fallback font stacks
- Font loading optimization

#### 5.2 DOCX Font Mapping
- Map web fonts to DOCX-compatible fonts
- Fallback to standard fonts (Arial, Times New Roman, etc.)
- Handle font availability

---

## File Structure Changes

```
src/lib/resume/
├── types.ts                 # Add TemplateStyle interface
├── templates/
│   ├── index.ts            # Update with 12 templates
│   ├── configs.ts          # NEW: All template style configs
│   └── styles.ts            # NEW: Helper functions for styling
├── generator.ts             # Update to use template styles
└── store.ts                 # No changes needed

src/routes/resume-builder/
└── edit/[id]/
    └── +page.svelte         # Update to apply template styles
```

---

## Implementation Steps

1. **Step 1**: Extend type definitions with TemplateStyle
2. **Step 2**: Create all 12 template style configurations
3. **Step 3**: Update template registry with 12 templates
4. **Step 4**: Refactor generator.ts to be template-aware
5. **Step 5**: Update WYSIWYG editor to show template styles
6. **Step 6**: Test all templates in both editor and DOCX export
7. **Step 7**: Add preview images (optional later)

---

## ATS Compatibility Requirements

All templates MUST:
- Use standard fonts (no fancy/custom fonts in DOCX)
- Avoid graphics/images
- Use simple layouts
- Have proper text hierarchy
- Be easily parsable by ATS systems
- Use standard date formats
- Avoid complex tables/grids
- Use standard section headers

---

## Color System

### Color Palette Guidelines
- **Traditional**: Blues, navies, blacks, grays
- **Professional**: Greens, blues, grays
- **Clean**: Minimal colors, grays, subtle accents
- **Modern**: Bold colors (purples, reds, cyans)

### Color Format
- Hex codes for CSS/HTML
- RGB for DOCX (docx library uses hex internally)

---

## Font System

### Web Fonts (for Editor)
- Google Fonts CDN
- System font fallbacks
- Font display: swap for performance

### DOCX Fonts (for Export)
- Standard Windows fonts (Arial, Times New Roman, Calibri, etc.)
- Fallback to generic families if specific font unavailable
- Font mapping table for web → DOCX fonts

---

## Testing Checklist

- [ ] All 12 templates display correctly in editor
- [ ] All templates export to DOCX correctly
- [ ] Colors appear correctly in both editor and DOCX
- [ ] Fonts are readable and ATS-compliant
- [ ] Layout differences are visible
- [ ] All sections render properly
- [ ] No styling conflicts
- [ ] Responsive in editor view
- [ ] Live View shows correct template styling
- [ ] Sample data displays well in all templates

---

## Priority Order

1. **High Priority**: Templates T1, P1, C1, M1 (first of each category)
2. **Medium Priority**: Templates T2, P2, C2, M2
3. **Low Priority**: Templates T3, P3, C3, M3 (can refine after testing)

---

## Estimated Effort

- Type system updates: 30 min
- Template configs: 2-3 hours
- Generator updates: 3-4 hours
- Editor styling: 2-3 hours
- Testing & refinement: 2-3 hours
- **Total: ~12-15 hours**

---

## Next Steps After Approval

1. Start with type system updates
2. Create first 4 templates (one per category)
3. Update generator with template support
4. Update editor to show styles
5. Test and iterate
6. Add remaining 8 templates
7. Final testing and polish

