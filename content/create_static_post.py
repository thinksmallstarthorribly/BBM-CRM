from PIL import Image, ImageDraw, ImageFont
import textwrap

# Load the blank template
template = Image.open('/home/ubuntu/bbm_blank_template.jpg')

# Resize to 1080x1350 (Instagram standard) if needed
template = template.resize((1080, 1350), Image.LANCZOS)

# The premise text to add
premise = "IF YOU'RE CHECKING YOUR CLEANER'S WORK EVERY MORNING YOU DON'T HAVE A CLEANER YOU HAVE ANOTHER EMPLOYEE TO MANAGE"

# Colors
WHITE = (255, 255, 255)
BLUE = (95, 172, 219)  # #5FACDB

# Try to load Barlow Condensed Black
import os
font_path = None
for path in ['/home/ubuntu/BarlowCondensed-Black.ttf', '/usr/share/fonts/truetype/barlow/BarlowCondensed-Black.ttf']:
    if os.path.exists(path):
        font_path = path
        break

if not font_path:
    # Download it
    import subprocess
    subprocess.run(['wget', '-q', '-O', '/home/ubuntu/BarlowCondensed-Black.ttf', 
                   'https://github.com/jpt/barlow/raw/main/fonts/ttf/BarlowCondensed-Black.ttf'], check=False)
    # Try alternative source
    if not os.path.exists('/home/ubuntu/BarlowCondensed-Black.ttf') or os.path.getsize('/home/ubuntu/BarlowCondensed-Black.ttf') < 1000:
        subprocess.run(['wget', '-q', '-O', '/home/ubuntu/BarlowCondensed-Black.ttf',
                       'https://fonts.google.com/download?family=Barlow+Condensed'], check=False)
    font_path = '/home/ubuntu/BarlowCondensed-Black.ttf'

# Load font at a size that fits well in the middle area
# The text area is roughly between y=500 and y=1150 (below logo, above footer)
font_size = 72
try:
    font = ImageFont.truetype(font_path, font_size)
except:
    font = ImageFont.load_default()

draw = ImageDraw.Draw(template)

# Define the text area boundaries
text_area_top = 520
text_area_bottom = 1150
text_area_left = 60
text_area_right = 1020
max_width = text_area_right - text_area_left

# Word wrap the text to fit
def wrap_text(text, font, max_width, draw):
    words = text.split()
    lines = []
    current_line = ""
    for word in words:
        test_line = current_line + " " + word if current_line else word
        bbox = draw.textbbox((0, 0), test_line, font=font)
        if bbox[2] - bbox[0] <= max_width:
            current_line = test_line
        else:
            if current_line:
                lines.append(current_line)
            current_line = word
    if current_line:
        lines.append(current_line)
    return lines

lines = wrap_text(premise, font, max_width, draw)

# Calculate total text height
line_height = font_size + 15  # spacing between lines
total_height = len(lines) * line_height

# Center the text block vertically in the text area
start_y = text_area_top + (text_area_bottom - text_area_top - total_height) // 2

# Define which words should be blue (key emphasis words)
blue_words = {"CLEANER'S", "CLEANER", "ANOTHER", "EMPLOYEE", "MANAGE"}

# Draw each line, word by word for color control
for i, line in enumerate(lines):
    y = start_y + i * line_height
    # Center the line horizontally
    bbox = draw.textbbox((0, 0), line, font=font)
    line_width = bbox[2] - bbox[0]
    x = (1080 - line_width) // 2
    
    # Draw word by word for selective coloring
    words = line.split()
    current_x = x
    for j, word in enumerate(words):
        color = BLUE if word.strip("'.,!?") in blue_words else WHITE
        draw.text((current_x, y), word, font=font, fill=color)
        word_bbox = draw.textbbox((0, 0), word + " ", font=font)
        current_x += word_bbox[2] - word_bbox[0]

# Save the final image
output_path = '/home/ubuntu/bbm_new_static_post.jpg'
template.save(output_path, 'JPEG', quality=95)
print(f"Post saved to {output_path}")
print(f"Final size: {template.size}")
