const express = require("express");
const app = express();
const PORT = 4000;
const http = require("http").Server(app);
const cors = require("cors");
const socketIO = require('socket.io')(http, {
    cors: {
        origin: "http://localhost:3000"
    }
});
const puppeteer = require("puppeteer");
const PuppeteerMassScreenshots = require("./screen.shooter");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

socketIO.on("connection", (socket) => {
    console.log(`⚡: ${socket.id} user just connected!`);

    socket.on("browse", async ({ url }) => {
        const browser = await puppeteer.launch({
            headless: true,
        });
        const context = await browser.createIncognitoBrowserContext();
        const page = await context.newPage();
        await page.setViewport({
            width: 1255,
            height: 800,
        });
        await page.goto(url);
        const screenshots = new PuppeteerMassScreenshots();
        await screenshots.init(page, socket);
        await screenshots.start();
    
        socket.on("mouseMove", async ({ x, y }) => {
            try {
                //sets the cursor the position with Puppeteer
                await page.mouse.move(x, y);
                /*
                👇🏻 This function runs within the page's context, 
                   calculates the element position from the view point 
                   and returns the CSS style for the element.
                */
                const cur = await page.evaluate(
                    (p) => {
                        const elementFromPoint = document.elementFromPoint(p.x, p.y);
                        return window
                            .getComputedStyle(elementFromPoint, null)
                            .getPropertyValue("cursor");
                    },
                    { x, y }
                );
    
                //👇🏻 sends the CSS styling to the frontend
                socket.emit("cursor", cur);
            } catch (err) {}
        });
    
        //👇🏻 Listens for the exact position the user clicked
        //   and set the move to that position.
        socket.on("mouseClick", async ({ x, y }) => {
            try {
                await page.mouse.click(x, y);
            } catch (err) {}
        });

        socket.on("scroll", ({ position }) => {
            //scrolls the page
            page.evaluate((top) => {
                window.scrollTo({ top });
            }, position);
        });
    });

    socket.on("disconnect", () => {
        socket.disconnect();
        console.log("🔥: A user disconnected");
    });
});

app.get("/api", (req, res) => {
    res.json({
        message: "Hello world",
    });
});

http.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});