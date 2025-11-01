# Font Customization Implementation Plan
## User-Controlled Font Styles, Sizes, and Spacing

### Overview
Add comprehensive font customization controls allowing users to switch between different font families, adjust font sizes, and control letter spacing/line height for a polished, professional resume appearance.

---

## Requirements

### Font Families (10 Options)
1. **Arial** - Modern sans-serif, clean and neutral
2. **Calibri** - Microsoft Word default, safe and readable
3. **Cambria** - Serif designed for on-screen reading
4. **Helvetica** - Designer favorite, modern and professional
5. **Garamond** - Traditional serif, formal
6. **Georgia** - Serif with screen readability
7. **Verdana** - Wide spacing, highly readable
8. **Book Antiqua** - Classic traditional feel
9. **Times New Roman** - Classic but potentially old-fashioned
10. **Trebuchet MS** - Modern sans-serif with flair

### Font Size Guidelines
- **Body Text**: 10-12 points (default: 11pt)
- **Headers/Section Titles**: 14-16 points (default: 14pt)
- **Name/Title**: 16-18 points (default: 16pt)
- **Contact Info**: 9-11 points (default: 10pt)

### Spacing Guidelines
- **Line Spacing**: Single spacing (1.0) throughout
- **Letter Spacing**: Adjustable (normal, tight, loose)
- **Section Spacing**: Adjustable (compact, normal, spacious)

---

## Technical Implementation Plan

### Phase 1: Extend Data Model

#### 1.1 Update ResumeData Interface
**File**: `src/lib/resume/types.ts`

Add font customization properties to `ResumeData`:
```typescript
export interface ResumeData {
  // ... existing properties ...
  
  // Font Customization (user overrides)
  fontSettings?: {
    headerFont: string;           // Font family for headers
    bodyFont: string;             // Font family for body text
    contactFont: string;          // Font family for contact info
    
    headerFontSize: number;       // Size in points (14-16)
    bodyFontSize: number;         // Size in points (10-12)
    contactFontSize: number;     // Size in points (9-11)
    nameFontSize: number;        // Size in points (16-18)
    
    letterSpacing: 'normal' | 'tight' | 'loose';
    lineSpacing: number;        // 1.0 = single spacing
    
    sectionSpacing: 'compact' | 'normal' | 'spacious';
    
    // Advanced options
    useTemplateFonts: boolean;    // If false, use custom fonts
  };
}
```

#### 1.2 Create Font Constants
**File**: `src/lib/resume/fonts.ts` (NEW)

```typescript
export const RESUME_FONTS = {
  'Arial': { 
    family: 'Arial, sans-serif',
    docxFont: 'Arial',
    category: 'sans-serif',
    style: 'modern'
  },
  'Calibri': {
    family: 'Calibri, sans-serif',
    docxFont: 'Calibri',
    category: 'sans-serif',
    style: 'modern'
  },
  'Cambria': {
    family: 'Cambria, serif',
    docxFont: 'Cambria',
    category: 'serif',
    style: 'elegant'
  },
  'Helvetica': {
    family: 'Helvetica, Arial, sans-serif',
    docxFont: 'Helvetica',
    category: 'sans-serif',
    style: 'professional'
  },
  'Garamond': {
    family: 'Garamond, serif',
    docxFont: 'Garamond',
    category: 'serif',
    style: 'formal'
  },
  'Georgia': {
    family: 'Georgia, serif',
    docxFont: 'Georgia',
    category: 'serif',
    style: 'classic'
  },
  'Verdana': {
    family: 'Verdana, sans-serif',
    docxFont: 'Verdana',
    category: 'sans-serif',
    style: 'readable'
  },
  'Book Antiqua': {
    family: '"Book Antiqua", serif',
    docxFont: 'Book Antiqua',
    category: 'serif',
    style: 'traditional'
  },
  'Times New Roman': {
    family: '"Times New Roman", serif',
    docxFont: 'Times New Roman',
    category: 'serif',
    style: 'classic'
  },
  'Trebuchet MS': {
    family: '"Trebuchet MS", sans-serif',
    docxFont: 'Trebuchet MS',
    category: 'sans-serif',
    style: 'modern'
  }
} as const;

export type FontName = keyof typeof RESUME_FONTS;
```

---

### Phase 2: UI Controls

#### 2.1 Font Control Panel Component
**File**: `src/lib/resume/components/FontControls.svelte` (NEW)

Create a collapsible panel with:
- Font family dropdown (header, body, contact)
- Font size sliders (header, body, contact, name)
- Letter spacing selector (normal/tight/loose)
- Line spacing slider (0.8 - 1.5)
- Section spacing selector (compact/normal/spacious)
- "Use Template Fonts" toggle
- "Reset to Template Defaults" button
- Live preview of changes

#### 2.2 Integration into Editor
**File**: `src/routes/resume-builder/edit/[id]/+page.svelte`

Add Font Controls panel:
- Position: Sidebar or collapsible top panel
- Visible when editing resume
- Applies changes in real-time
- Auto-saves font preferences

---

### Phase 3: Apply Font Settings

#### 3.1 Font Helper Functions
**File**: `src/lib/resume/utils/font-helpers.ts` (NEW)

```typescript
export function getEffectiveFont(
  resumeData: ResumeData,
  templateStyle: TemplateStyle,
  fontType: 'header' | 'body' | 'contact'
): string {
  if (resumeData.fontSettings && !resumeData.fontSettings.useTemplateFonts) {
    switch (fontType) {
      case 'header': return resumeData.fontSettings.headerFont;
      case 'body': return resumeData.fontSettings.bodyFont;
      case 'contact': return resumeData.fontSettings.contactFont;
    }
  }
  return templateStyle.headerFont; // fallback
}

export function getEffectiveFontSize(
  resumeData: ResumeData,
  templateStyle: TemplateStyle,
  fontSizeType: 'header' | 'body' | 'contact' | 'name'
): number {
  if (resumeData.fontSettings && !resumeData.fontSettings.useTemplateFonts) {
    switch (fontSizeType) {
      case 'header': return resumeData.fontSettings.headerFontSize;
      case 'body': return resumeData.fontSettings.bodyFontSize;
      case 'contact': return resumeData.fontSettings.contactFontSize;
      case 'name': return resumeData.fontSettings.nameFontSize;
    }
  }
  return templateStyle.headerFontSize; // fallback
}
```

#### 3.2 Update Editor Styling
**File**: `src/routes/resume-builder/edit/[id]/+page.svelte`

- Apply font families dynamically
- Apply font sizes dynamically
- Apply letter spacing via CSS
- Apply line spacing via CSS
- Apply section spacing dynamically

#### 3.3 Update DOCX Generator
**File**: `src/lib/resume/generator.ts`

- Use `getEffectiveFont()` and `getEffectiveFontSize()` functions
- Apply letter spacing in TextRun
- Apply line spacing in Paragraph
- Apply section spacing

---

### Phase 4: UI/UX Design

#### 4.1 Font Control Panel Layout

```
┌─────────────────────────────────────┐
│ 📝 Font Settings           [▼]      │
├─────────────────────────────────────┤
│                                      │
│ Use Template Fonts: [Toggle]        │
│                                      │
│ Header Font:     [Dropdown ▼]       │
│ Header Size:     [Slider] 14pt     │
│                                      │
│ Body Font:       [Dropdown ▼]      │
│ Body Size:       [Slider] 11pt     │
│                                      │
│ Contact Font:    [Dropdown ▼]      │
│ Contact Size:    [Slider] 10pt     │
│                                      │
│ Name Size:       [Slider] 16pt     │
│                                      │
│ Letter Spacing:  [Normal ▼]        │
│ Line Spacing:    [Slider] 1.0      │
│                                      │
│ Section Spacing: [Normal ▼]        │
│                                      │
│ [Reset to Template Defaults]       │
│                                      │
└─────────────────────────────────────┘
```

#### 4.2 Font Preview
- Show sample text in selected font
- Real-time preview in editor
- Visual comparison option

---

## Implementation Steps

### Step 1: Extend Types and Constants (30 min)
1. Update `ResumeData` interface
2. Create `RESUME_FONTS` constants
3. Update `createEmptyResume()` to include default font settings

### Step 2: Create Font Control Component (2-3 hours)
1. Build `FontControls.svelte` component
2. Add dropdowns for font selection
3. Add sliders for font sizes
4. Add selectors for spacing
5. Add toggle for template fonts

### Step 3: Integration (1-2 hours)
1. Add Font Controls to editor page
2. Wire up real-time updates
3. Connect to auto-save

### Step 4: Apply Fonts (2-3 hours)
1. Create font helper functions
2. Update editor to use effective fonts
3. Update DOCX generator to use effective fonts
4. Apply CSS for spacing

### Step 5: Testing (1 hour)
1. Test all font combinations
2. Test font sizes
3. Test spacing options
4. Test DOCX export with custom fonts
5. Test template font toggle

---

## Technical Details

### Font Size Conversion
- Points to Pixels: `pt = px * (72/96)` (approximate)
- For DOCX: Use points directly
- For Web: Convert to pixels or use CSS `pt` units

### Letter Spacing Values
- Normal: `letter-spacing: normal` (0)
- Tight: `letter-spacing: -0.5px`
- Loose: `letter-spacing: 0.5px`

### Line Spacing
- Single: `line-height: 1.0`
- 1.15: `line-height: 1.15`
- 1.5: `line-height: 1.5`

### Section Spacing
- Compact: 180 points
- Normal: 240 points
- Spacious: 300 points

---

## File Structure

```
src/lib/resume/
├── types.ts                     # Add FontSettings interface
├── fonts.ts                     # NEW: Font constants
├── utils/
│   ├── font-helpers.ts          # NEW: Font helper functions
│   ├── date-formatter.ts        # Existing
│   └── bullet-styles.ts         # Existing
├── components/
│   ├── FontControls.svelte      # NEW: Font control UI
│   └── TemplatePreview.svelte   # Existing
└── generator.ts                 # Update to use font helpers

src/routes/resume-builder/edit/[id]/
└── +page.svelte                 # Add FontControls component
```

---

## User Experience Flow

1. User opens resume editor
2. Sees "Font Settings" panel (collapsible)
3. Can toggle "Use Template Fonts" on/off
4. If off, can select custom fonts:
   - Choose header font from dropdown
   - Adjust header size with slider
   - Choose body font from dropdown
   - Adjust body size with slider
   - Choose contact font from dropdown
   - Adjust contact size with slider
   - Adjust name size
   - Choose letter spacing
   - Adjust line spacing
   - Choose section spacing
5. Changes apply immediately in editor
6. Changes auto-save to resume data
7. DOCX export uses custom fonts

---

## ATS Compatibility

### Font Requirements
- All fonts must be standard Windows fonts for DOCX
- Font fallbacks for web preview
- Font names must match DOCX library expectations

### Size Requirements
- Minimum 10pt for body text (ATS readability)
- Maximum 18pt for headers (professional appearance)
- Consistent sizing throughout

---

## Advanced Features (Future)

### Phase 6: Advanced Typography
- Font weight controls (normal, bold, 600, 700, 800)
- Text transform options (uppercase, lowercase, capitalize)
- Font color customization (if template allows)
- Italic toggle for specific sections

### Phase 7: Font Presets
- "Professional" preset (Arial, 11pt body, 14pt headers)
- "Classic" preset (Times New Roman, 12pt body, 16pt headers)
- "Modern" preset (Calibri, 11pt body, 14pt headers)
- Custom presets (save user's favorite combinations)

---

## Testing Checklist

- [ ] All 10 fonts render correctly in editor
- [ ] All 10 fonts export correctly to DOCX
- [ ] Font sizes apply correctly (10-18pt range)
- [ ] Letter spacing works in editor and DOCX
- [ ] Line spacing works in editor and DOCX
- [ ] Section spacing works in editor and DOCX
- [ ] "Use Template Fonts" toggle works
- [ ] Reset button restores template defaults
- [ ] Font preferences persist across sessions
- [ ] Real-time preview updates immediately
- [ ] DOCX export matches editor preview
- [ ] All combinations are ATS-compatible

---

## Estimated Effort

- Type system updates: 30 min
- Font constants: 30 min
- Font Controls component: 2-3 hours
- Font helper functions: 1 hour
- Editor integration: 1-2 hours
- DOCX generator updates: 2-3 hours
- Testing & refinement: 2-3 hours
- **Total: ~10-14 hours**

---

## Success Criteria

1. ✅ Users can switch between 10 professional fonts
2. ✅ Users can adjust font sizes (10-18pt)
3. ✅ Users can control letter and line spacing
4. ✅ Changes apply immediately in editor
5. ✅ DOCX export matches editor preview
6. ✅ All fonts are ATS-compatible
7. ✅ Font preferences persist
8. ✅ Template fonts can be overridden or kept

---

## Next Steps After Approval

1. Extend ResumeData interface with FontSettings
2. Create font constants file
3. Build FontControls component
4. Integrate into editor
5. Update generator to use custom fonts
6. Test all combinations
7. Polish UI/UX

