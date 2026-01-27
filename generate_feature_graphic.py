from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

# Settings
WIDTH, HEIGHT = 1024, 500
TEXT = "AI 주식 상담사"
FONT_PATH = "C:\\Windows\\Fonts\\malgunbd.ttf"
OUTPUT_FILE = "feature_graphic.png"

def create_gradient(width, height, start_color, end_color):
    base = Image.new('RGB', (width, height), start_color)
    top = Image.new('RGB', (width, height), end_color)
    mask = Image.new('L', (width, height))
    mask_data = []
    for y in range(height):
        for x in range(width):
            mask_data.append(int(255 * (x / width))) # Horizontal gradient
    mask.putdata(mask_data)
    base.paste(top, (0, 0), mask)
    return base

# 1. Create Background (Dark Blue/Purple Gradient)
# Deep Navy (10, 25, 47) to Purple (45, 10, 50)
bg = create_gradient(WIDTH, HEIGHT, (10, 20, 50), (40, 10, 60))

# 2. Add some "Digital" grid lines for tech feel
draw = ImageDraw.Draw(bg)
for i in range(0, WIDTH, 50):
    draw.line([(i, 0), (i, HEIGHT)], fill=(255, 255, 255, 10), width=1)
for i in range(0, HEIGHT, 50):
    draw.line([(0, i), (WIDTH, i)], fill=(255, 255, 255, 10), width=1)

# 3. Add Text
try:
    font_size = 80
    font = ImageFont.truetype(FONT_PATH, font_size)
    
    # Calculate text position
    bbox = draw.textbbox((0, 0), TEXT, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (WIDTH - text_width) // 2
    y = (HEIGHT - text_height) // 2
    
    # Text Shadow (Glow effect)
    shadow_offset = 3
    draw.text((x + shadow_offset, y + shadow_offset), TEXT, font=font, fill=(0, 0, 0, 150))
    
    # Main Text
    draw.text((x, y), TEXT, font=font, fill=(255, 255, 255))
    
    print(f"Successfully drew text: {TEXT}")
except Exception as e:
    print(f"Font error: {e}")
    # Fallback if font fails
    draw.text((100, 200), "AI Stock Analyst", fill=(255, 255, 255))

# 4. Save
output_path = os.path.join(os.getcwd(), OUTPUT_FILE)
bg.save(output_path)
print(f"Feature graphic saved to: {output_path}")
