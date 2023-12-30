import { useState, useEffect, useCallback, useRef} from "react";
import socketIO from "socket.io-client";
const socket = socketIO.connect("https://puppeteer-test-backend.onrender.com");

const Modal = ({ url }) => {
    const ref = useRef(null);
    const [image, setImage] = useState("");
    const [cursor, setCursor] = useState("");
    const [fullHeight, setFullHeight] = useState("");


    const mouseMove = useCallback((event) => {
        const position = event.currentTarget.getBoundingClientRect();
        const widthChange = 1255 / position.width;
        const heightChange = 800 / position.height;
    
        socket.emit("mouseMove", {
            x: widthChange * (event.pageX - position.left),
            y:
                heightChange *
                (event.pageY - position.top - document.documentElement.scrollTop),
        });
    }, []);
    
    const mouseClick = useCallback((event) => {
        const position = event.currentTarget.getBoundingClientRect();
        const widthChange = 1255 / position.width;
        const heightChange = 800 / position.height;
        socket.emit("mouseClick", {
            x: widthChange * (event.pageX - position.left),
            y:
                heightChange *
                (event.pageY - position.top - document.documentElement.scrollTop),
        });
    }, []);

    const mouseScroll = useCallback((event) => {
        const position = event.currentTarget.scrollTop;
        socket.emit("scroll", {
            position,
        });
    }, []);

    useEffect(() => {
        socket.emit("browse", {
            url,
        });

        socket.on("image", ({ img, fullHeight }) => {
            setImage("data:image/jpeg;base64," + img);
            setFullHeight(fullHeight);
        });

        socket.on("cursor", (cur) => {
            setCursor(cur);
        });
    }, [url]);



    return (
        <div className='popup' onScroll={mouseScroll}>
            <div
                ref={ref}
                className='popup-ref'
                style={{ cursor, height: fullHeight }}
            >
                {image && (
                    <img
                        src={image}
                        onMouseMove={mouseMove}
                        onClick={mouseClick}
                        alt=''
                    />
                )}
            </div>
        </div>
    );
};

export default Modal;