import asyncio
from playwright.async_api import async_playwright
import os
import subprocess
import time

async def capture_screenshots():
    # Start a local server
    server_process = subprocess.Popen(["python3", "-m", "http.server", "8001"])
    time.sleep(2)  # Give the server time to start

    pages = [
        {"name": "ar_index", "url": "http://localhost:8001/ar/index.html"},
        {"name": "ar_previous_work", "url": "http://localhost:8001/ar/previous-work.html"},
        {"name": "ar_404", "url": "http://localhost:8001/ar/404.html"}
    ]

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={'width': 1280, 'height': 800})

        for page_info in pages:
            page = await context.new_page()
            print(f"Capturing {page_info['url']}...")
            await page.goto(page_info['url'], wait_until="networkidle")
            # Wait a bit for any dynamic content/animations
            await asyncio.sleep(2)
            await page.screenshot(path=f"{page_info['name']}.png", full_page=True)
            print(f"Saved {page_info['name']}.png")

        await browser.close()

    # Kill the server
    server_process.terminate()

if __name__ == "__main__":
    asyncio.run(capture_screenshots())
