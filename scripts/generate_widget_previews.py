import os
from PIL import Image, ImageDraw, ImageFont

# Canvas dimensions
WIDTH = 800
HEIGHT = 420

# Colors (ApplePalette)
BG_SURFACE = (28, 28, 30, 255)         # #1C1C1E
BG_SUBTLE = (44, 44, 46, 255)          # #2C2C2E
BG_ELEVATED = (58, 58, 60, 255)        # #3A3A3C
BORDER_COLOR = (56, 56, 58, 255)       # #38383A
TEXT_PRIMARY = (255, 255, 255, 255)    # #FFFFFF
TEXT_SECONDARY = (142, 142, 147, 255)  # #8E8E93
TEXT_TERTIARY = (99, 99, 102, 255)     # #636366

APPLE_MINT = (48, 209, 88, 255)        # #30D158
APPLE_BLUE = (10, 132, 255, 255)       # #0A84FF
APPLE_AMBER = (255, 159, 10, 255)      # #FF9F0A
APPLE_PURPLE = (191, 90, 242, 255)     # #BF5AF2
APPLE_CORAL = (255, 69, 58, 255)       # #FF453A
APPLE_TEAL = (100, 210, 255, 255)      # #64D2FF

# Font loading
FONT_DIR = "C:/Windows/Fonts"
font_bold_huge = ImageFont.truetype(f"{FONT_DIR}/segoeuib.ttf", 46)
font_bold_large = ImageFont.truetype(f"{FONT_DIR}/segoeuib.ttf", 32)
font_bold_med = ImageFont.truetype(f"{FONT_DIR}/segoeuib.ttf", 22)
font_bold_sm = ImageFont.truetype(f"{FONT_DIR}/segoeuib.ttf", 16)
font_bold_xs = ImageFont.truetype(f"{FONT_DIR}/segoeuib.ttf", 13)

font_reg_large = ImageFont.truetype(f"{FONT_DIR}/segoeui.ttf", 24)
font_reg_med = ImageFont.truetype(f"{FONT_DIR}/segoeui.ttf", 18)
font_reg_sm = ImageFont.truetype(f"{FONT_DIR}/segoeui.ttf", 15)
font_reg_xs = ImageFont.truetype(f"{FONT_DIR}/segoeui.ttf", 12)

def create_base_canvas():
    # Transparent canvas with rounded widget surface
    img = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Outer squircle
    pad = 12
    draw.rounded_rectangle(
        [(pad, pad), (WIDTH - pad, HEIGHT - pad)],
        radius=42,
        fill=BG_SURFACE,
        outline=BORDER_COLOR,
        width=2
    )
    return img, draw

# ── 1. SMART STACK PREVIEW ──
def render_smart_stack():
    img, draw = create_base_canvas()
    
    # Header
    # Live pill
    draw.rounded_rectangle([(36, 36), (142, 70)], radius=17, fill=(48, 209, 88, 35), outline=APPLE_MINT, width=1)
    draw.ellipse([(48, 48), (58, 58)], fill=APPLE_MINT)
    draw.text((68, 43), "LIVE NOW", font=font_bold_xs, fill=APPLE_MINT)
    
    # Subject badge
    draw.text((156, 42), "CSE320 • Software Engineering", font=font_bold_med, fill=TEXT_PRIMARY)
    
    # Right-hand vertical indicator stack dots
    # Dot 1: Active capsule
    draw.rounded_rectangle([(750, 42), (756, 66)], radius=3, fill=TEXT_PRIMARY)
    # Dot 2
    draw.ellipse([(751, 74), (755, 78)], fill=TEXT_TERTIARY)
    # Dot 3
    draw.ellipse([(751, 86), (755, 90)], fill=TEXT_TERTIARY)
    # Dot 4
    draw.ellipse([(751, 98), (755, 102)], fill=TEXT_TERTIARY)

    # Middle hero
    # Time
    draw.text((36, 92), "09:00 AM – 10:00 AM", font=font_bold_huge, fill=TEXT_PRIMARY)
    
    # Location & room
    draw.text((36, 154), "Block 34 • 1st Floor", font=font_reg_large, fill=APPLE_TEAL)
    
    # Room tag pill
    draw.rounded_rectangle([(36, 196), (156, 234)], radius=12, fill=BG_SUBTLE, outline=BORDER_COLOR, width=1)
    draw.text((50, 203), "Room 34-101", font=font_bold_sm, fill=TEXT_PRIMARY)
    
    # Bunk Margin pill
    draw.rounded_rectangle([(168, 196), (300, 234)], radius=12, fill=(48, 209, 88, 35), outline=APPLE_MINT, width=1)
    draw.text((182, 203), "✓ +3 Can Skip", font=font_bold_sm, fill=APPLE_MINT)
    
    # Time remaining pill
    draw.rounded_rectangle([(312, 196), (430, 234)], radius=12, fill=(10, 132, 255, 30), outline=APPLE_BLUE, width=1)
    draw.text((326, 203), "⏳ 42m Left", font=font_bold_sm, fill=APPLE_BLUE)

    # Next Class upcoming preview bar at bottom
    draw.rounded_rectangle([(36, 260), (740, 372)], radius=22, fill=BG_SUBTLE, outline=BORDER_COLOR, width=1)
    draw.text((54, 276), "UP NEXT AT 10:00 AM", font=font_bold_xs, fill=TEXT_SECONDARY)
    draw.text((54, 300), "INT219 • Front End Web Development", font=font_bold_med, fill=TEXT_PRIMARY)
    draw.text((54, 334), "Block 38 • Room 38-302 • Attendance Safe (82.1%)", font=font_reg_sm, fill=TEXT_SECONDARY)
    
    # Action chip on right
    draw.rounded_rectangle([(600, 296), (720, 340)], radius=14, fill=BG_ELEVATED)
    draw.text((618, 308), "Timetable ›", font=font_bold_sm, fill=APPLE_BLUE)
    
    output_path = "assets/widgets/smart_stack_preview.png"
    img.save(output_path, "PNG")
    print(f"Saved {output_path}")

# ── 2. ATTENDANCE & BUNK MARGIN PREVIEW ──
def render_attendance():
    img, draw = create_base_canvas()
    
    # Header
    draw.text((36, 38), "ATTENDANCE & SAFETY", font=font_bold_xs, fill=TEXT_SECONDARY)
    draw.text((36, 58), "University Overall Standing", font=font_bold_large, fill=TEXT_PRIMARY)
    
    # Left Hero: Large Percentage
    draw.text((36, 108), "78.4%", font=font_bold_huge, fill=APPLE_MINT)
    draw.text((36, 172), "75% Target Threshold: +3.4% Margin", font=font_reg_sm, fill=TEXT_SECONDARY)
    
    # Right: Bunk Margin Pill Hero
    draw.rounded_rectangle([(460, 96), (740, 170)], radius=20, fill=(48, 209, 88, 35), outline=APPLE_MINT, width=2)
    draw.text((484, 110), "+3 CLASSES", font=font_bold_large, fill=APPLE_MINT)
    draw.text((484, 144), "Safe to miss without dropping below 75%", font=font_reg_xs, fill=APPLE_MINT)
    
    # Progress Bar container
    draw.text((36, 214), "ATTENDANCE PROGRESS", font=font_bold_xs, fill=TEXT_SECONDARY)
    draw.text((630, 214), "58 / 74 Classes", font=font_bold_xs, fill=TEXT_PRIMARY)
    
    bar_y = 240
    draw.rounded_rectangle([(36, bar_y), (740, bar_y + 20)], radius=10, fill=BG_SUBTLE)
    # Mint fill (78.4% of 704 width = 552)
    draw.rounded_rectangle([(36, bar_y), (36 + 552, bar_y + 20)], radius=10, fill=APPLE_MINT)
    # 75% target line (75% of 704 = 528)
    draw.line([(36 + 528, bar_y - 4), (36 + 528, bar_y + 24)], fill=TEXT_PRIMARY, width=3)
    
    # Bottom 3 subject pills
    subjects = [
        ("CSE320", "84.2%", "+4 Safe", APPLE_MINT),
        ("INT219", "76.0%", "+1 Safe", APPLE_AMBER),
        ("MTH401", "72.5%", "Need 2", APPLE_CORAL),
    ]
    for i, (code, pct, status, col) in enumerate(subjects):
        x1 = 36 + i * 240
        x2 = x1 + 224
        draw.rounded_rectangle([(x1, 286), (x2, 372)], radius=18, fill=BG_SUBTLE, outline=BORDER_COLOR, width=1)
        draw.text((x1 + 16, 298), code, font=font_bold_sm, fill=TEXT_PRIMARY)
        draw.text((x1 + 16, 324), pct, font=font_bold_large, fill=col)
        draw.text((x1 + 120, 332), status, font=font_bold_xs, fill=col)

    output_path = "assets/widgets/attendance_preview.png"
    img.save(output_path, "PNG")
    print(f"Saved {output_path}")

# ── 3. QUICK STATS PREVIEW ──
def render_quick_stats():
    img, draw = create_base_canvas()
    
    # Header
    draw.text((36, 36), "ACADEMIC OVERVIEW", font=font_bold_xs, fill=TEXT_SECONDARY)
    draw.text((36, 56), "Student Portal Glance", font=font_bold_large, fill=TEXT_PRIMARY)
    
    # 3 Modular Cards
    # Card 1: CGPA
    draw.rounded_rectangle([(36, 110), (260, 360)], radius=24, fill=BG_SUBTLE, outline=BORDER_COLOR, width=1)
    draw.text((54, 126), "CUMULATIVE GPA", font=font_bold_xs, fill=TEXT_SECONDARY)
    draw.text((54, 154), "8.42", font=font_bold_huge, fill=APPLE_PURPLE)
    draw.text((54, 220), "Term GPA: 8.60", font=font_bold_sm, fill=TEXT_PRIMARY)
    draw.text((54, 250), "36 Credits Completed", font=font_reg_xs, fill=TEXT_SECONDARY)
    draw.rounded_rectangle([(54, 300), (242, 336)], radius=12, fill=BG_ELEVATED)
    draw.text((70, 308), "View Grade Details ›", font=font_bold_xs, fill=APPLE_PURPLE)

    # Card 2: Attendance
    draw.rounded_rectangle([(276, 110), (500, 360)], radius=24, fill=BG_SUBTLE, outline=BORDER_COLOR, width=1)
    draw.text((294, 126), "OVERALL ATTENDANCE", font=font_bold_xs, fill=TEXT_SECONDARY)
    draw.text((294, 154), "78.4%", font=font_bold_huge, fill=APPLE_MINT)
    draw.text((294, 220), "+3 Can Skip", font=font_bold_sm, fill=APPLE_MINT)
    draw.text((294, 250), "58 / 74 Classes Attended", font=font_reg_xs, fill=TEXT_SECONDARY)
    draw.rounded_rectangle([(294, 300), (482, 336)], radius=12, fill=(48, 209, 88, 35), outline=APPLE_MINT, width=1)
    draw.text((310, 308), "✓ Safe Margin (+3.4%)", font=font_bold_xs, fill=APPLE_MINT)

    # Card 3: Next Class
    draw.rounded_rectangle([(516, 110), (740, 360)], radius=24, fill=BG_SUBTLE, outline=BORDER_COLOR, width=1)
    draw.text((534, 126), "UPCOMING CLASS", font=font_bold_xs, fill=TEXT_SECONDARY)
    draw.text((534, 154), "34-101", font=font_bold_huge, fill=APPLE_BLUE)
    draw.text((534, 220), "09:00 AM • CSE320", font=font_bold_sm, fill=TEXT_PRIMARY)
    draw.text((534, 250), "Block 34 • 1st Floor", font=font_reg_xs, fill=APPLE_TEAL)
    draw.rounded_rectangle([(534, 300), (722, 336)], radius=12, fill=BG_ELEVATED)
    draw.text((550, 308), "Open Timetable ›", font=font_bold_xs, fill=APPLE_BLUE)

    output_path = "assets/widgets/quick_stats_preview.png"
    img.save(output_path, "PNG")
    print(f"Saved {output_path}")

if __name__ == "__main__":
    render_smart_stack()
    render_attendance()
    render_quick_stats()
