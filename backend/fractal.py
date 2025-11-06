from PIL import Image

# Image size
width, height = 400, 400

# Mandelbrot parameters
max_iter = 200  # how many iterations to check
x_min, x_max = -1.5,0.5
y_min, y_max = -1,1

# Create image
img = Image.new("RGB", (width, height))
pixels = img.load()

for px in range(width):
    for py in range(height):
        # Map pixel position to complex plane
        x0 = x_min + (px / (width-1)) * (x_max - x_min)
        y0 = y_min + (py / (height-1)) * (y_max - y_min)
        c = complex(x0, y0)
        z = 0 + 0j
        iteration = 0
        # if x_min==x0:
        #     print(f"{({px,py})} -> {({x0,y0})},{x_min},{z}")
        # Mandelbrot iteration
        while abs(z) <= 2 and iteration < max_iter:
            z = z*z + c
            iteration += 1

        # Color mapping
        color = 255 - int(iteration * 255 / max_iter)
        rgb = tuple(int('F08A5D'[i:i+2], 16) for i in (0, 2, 4))
        print(rgb)
        if color!=0:
            pixels[px, py] = rgb
        else:
            pixels[px,py] = (0,0,0)

# Save image
img.save("mandelbrot_basic.png")
print("Mandelbrot fractal saved as mandelbrot_basic.png")

from celery import shared_task

@shared_task
def 


