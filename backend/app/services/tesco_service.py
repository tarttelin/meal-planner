from pathlib import Path
from playwright.async_api import async_playwright, BrowserContext, Page

PROFILE_DIR = Path(__file__).parent.parent.parent / "data" / "tesco-profile"

class TescoService:
    _instance = None

    def __init__(self):
        self._playwright = None
        self.context: BrowserContext | None = None
        self.page: Page | None = None
        self._logged_in = False

    @classmethod
    def get_instance(cls) -> "TescoService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @property
    def connected(self) -> bool:
        return self.context is not None

    @property
    def logged_in(self) -> bool:
        return self._logged_in and self.connected

    async def launch(self):
        PROFILE_DIR.mkdir(parents=True, exist_ok=True)
        self._playwright = await async_playwright().start()
        self.context = await self._playwright.chromium.launch_persistent_context(
            str(PROFILE_DIR),
            headless=False,
            channel="chromium",
            args=[
                "--disable-blink-features=AutomationControlled",
            ],
            ignore_default_args=["--enable-automation"],
            user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
        )
        self.page = self.context.pages[0] if self.context.pages else await self.context.new_page()

    async def login(self) -> dict:
        if not self.connected:
            await self.launch()
        await self.page.goto("https://www.tesco.com/groceries/en-GB/")
        return {"status": "browser_opened", "message": "Please log in via the browser window"}

    async def check_login(self) -> bool:
        if not self.page:
            return False
        try:
            url = self.page.url
            cookies = await self.context.cookies()
            auth_cookies = [c for c in cookies if "auth" in c["name"].lower() or "session" in c["name"].lower()]
            self._logged_in = len(auth_cookies) > 0 or "account" in url.lower()
            return self._logged_in
        except Exception:
            return False

    async def search(self, query: str) -> list[dict]:
        if not self.page:
            return []
        await self.page.goto(f"https://www.tesco.com/groceries/en-GB/search?query={query}")
        await self.page.wait_for_selector("[data-auto='product-tile']", timeout=10000)
        products = await self.page.eval_on_selector_all(
            "[data-auto='product-tile']",
            """tiles => tiles.slice(0, 10).map(tile => ({
                id: tile.querySelector('[data-auto="product-tile--title"]')?.href?.match(/products\\/(.+)/)?.[1] || '',
                name: tile.querySelector('[data-auto="product-tile--title"]')?.textContent?.trim() || '',
                price: tile.querySelector('[data-auto="price-value"]')?.textContent?.trim() || '',
            }))"""
        )
        return products

    async def add_to_basket(self, product_ids: list[str] | None = None):
        if not self.page:
            return {"error": "Not connected"}
        buttons = await self.page.query_selector_all("[data-auto='btn-add']")
        added = 0
        for btn in buttons[:5]:
            try:
                await btn.click()
                added += 1
            except Exception:
                pass
        return {"added": added}

    async def get_basket(self) -> list[dict]:
        if not self.page:
            return []
        await self.page.goto("https://www.tesco.com/groceries/en-GB/trolley")
        await self.page.wait_for_load_state("networkidle")
        return []

    async def close(self):
        if self.context:
            await self.context.close()
        if self._playwright:
            await self._playwright.stop()
        self._playwright = None
        self.context = None
        self.page = None
        self._logged_in = False
