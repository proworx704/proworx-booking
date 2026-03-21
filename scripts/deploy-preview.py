import asyncio
import sys
sys.path.insert(0, "/work")
from sdk.tools.viktor_spaces_tools import deploy_app

async def main():
    result = await deploy_app("proworx-booking", "preview", "Phase 3: ZIP code smart scheduling - ZIP field, recommended slots, route clustering dashboard")
    print(f"URL: {result.url}")
    print(f"Status: {result.status}")

asyncio.run(main())
