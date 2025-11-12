# Creating Icons for CookieGuard

## Quick Solution (Use Placeholders)

The extension will work without custom icons - Chrome will use default placeholders. You can skip this and load the extension immediately.

## Option 1: Use Online Tool (Easiest - 2 minutes)

1. Go to: https://www.favicon-generator.org/
2. Upload any cookie image (or use the SVG in this folder)
3. Download the generated icons
4. Extract and copy these to this folder:
   - `icon16.png` (16x16 pixels)
   - `icon48.png` (48x48 pixels)
   - `icon128.png` (128x128 pixels)

## Option 2: Use Figma/Canva (5 minutes)

1. Create a 128x128px canvas
2. Design a cookie + shield icon
3. Export as PNG at:
   - 16x16
   - 48x48
   - 128x128

## Option 3: Use Command Line (macOS/Linux)

If you have ImageMagick installed:

```bash
# Create from SVG
magick icon.svg -resize 16x16 icon16.png
magick icon.svg -resize 48x48 icon48.png
magick icon.svg -resize 128x128 icon128.png
```

## Option 4: Simple Emoji Icons (10 seconds)

Create simple emoji-based icons using a screenshot tool:

1. Open TextEdit
2. Type: 🍪🛡️
3. Make it huge (size 200+)
4. Take screenshots at different sizes
5. Save as icon16.png, icon48.png, icon128.png

## Design Recommendations

**Color Scheme:**
- Primary: #667eea (purple-blue)
- Secondary: #764ba2 (deep purple)
- Accent: White

**Elements:**
- Cookie (🍪 emoji or round shape with chocolate chips)
- Shield or lock (🛡️ or 🔒 for security)
- Checkmark (✓ for protection)

**Style:**
- Modern, flat design
- Clear at small sizes (16x16)
- Professional but friendly

## Current Status

- Extension will work without icons (uses Chrome defaults)
- An SVG template is provided in `icon.svg`
- Once you have PNG files, replace the defaults

---

**For now, you can load the extension without custom icons!**
