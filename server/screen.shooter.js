const { join } = require("path");

const fs = require("fs").promises;
const emptyFunction = async () => {};
const defaultAfterWritingNewFile = async (filename) =>
    console.log(`${filename} was written`);

class PuppeteerMassScreenshots {
    /*
    page - represents the web page
    socket - Socket.io
    options - Chrome DevTools configurations
    */
    async init(page, socket, options = {}) {
        const runOptions = {
            //👇🏻 Their values must be asynchronous codes
            beforeWritingImageFile: emptyFunction,
            afterWritingImageFile: defaultAfterWritingNewFile,
            beforeAck: emptyFunction,
            afterAck: emptyFunction,
            ...options,
        };
        this.socket = socket;
        this.page = page;

        //👇🏻 CDPSession instance is used to talk raw Chrome Devtools Protocol
        this.client = await this.page.target().createCDPSession();
        this.canScreenshot = true;

        //👇🏻 The frameObject parameter contains the compressed image data 
    //   requested by the Page.startScreencast.
        this.client.on("Page.screencastFrame", async (frameObject) => {
            if (this.canScreenshot) {
                await runOptions.beforeWritingImageFile();
                const filename = await this.writeImageFilename(frameObject.data);
                await runOptions.afterWritingImageFile(filename);

                try {
                    await runOptions.beforeAck();
                    /*👇🏻 acknowledges that a screencast frame  (image) has been received by the frontend.
                    The sessionId - represents the frame number
                    */
                    await this.client.send("Page.screencastFrameAck", {
                        sessionId: frameObject.sessionId,
                    });
                    await runOptions.afterAck();
                } catch (e) {
                    this.canScreenshot = false;
                }
            }
        });
    }

    async writeImageFilename(data) {
        const fullHeight = await this.page.evaluate(() => {
            return Math.max(
                document.body.scrollHeight,
                document.documentElement.scrollHeight,
                document.body.offsetHeight,
                document.documentElement.offsetHeight,
                document.body.clientHeight,
                document.documentElement.clientHeight
            );
        });
        //Sends an event containing the image and its full height
        return this.socket.emit("image", { img: data, fullHeight });
    }
    /*
    The startOptions specify the properties of the screencast
    👉🏻 format - the file type (Allowed fomats: 'jpeg' or 'png')
    👉🏻 quality - sets the image quality (default is 100)
    👉🏻 everyNthFrame - specifies the number of frames to ignore before taking the next screenshots. (The more frames we ignore, the less screenshots we will have)
    */
    async start(options = {}) {
        const startOptions = {
            format: "jpeg",
            quality: 10,
            everyNthFrame: 1,
            ...options,
        };
        try {
            await this.client?.send("Page.startScreencast", startOptions);
        } catch (err) {}
    }

    /* 
    Learn more here 👇🏻: 
    https://github.com/shaynet10/puppeteer-mass-screenshots/blob/main/index.js
    */
    async stop() {
        try {
            await this.client?.send("Page.stopScreencast");
        } catch (err) {}
    }
}

module.exports = PuppeteerMassScreenshots;