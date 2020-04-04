
function translateKey(html5code)
{
    mapindex=key_translation_map[html5code];
    c64code=c64keymap[mapindex];
    return c64code;
}

c64keymap = [
            // First physical key row
            [7, 1], [7, 0], [7, 3], [1, 0], [1, 3], [2, 0], [2, 3], [3, 0],
            [3, 3], [4, 0], [4, 3], [5, 0], [5, 3], [6, 0], [6, 3], [0, 0],
            [0, 4] /* f1 */,
            
            // Second physical key row
            [7, 2], [7, 6], [1, 1], [1, 6], [2, 1], [2, 6], [3, 1], [3, 6],
            [4, 1], [4, 6], [5, 1], [5, 6], [6, 1], [6, 6], [9, 9], [0, 5] /* f3 */,

            // Third physical key row
            [7, 7], [9, 9], [1, 2], [1, 5], [2, 2], [2, 5], [3, 2], [3, 5],
            [4, 2], [4, 5], [5, 2], [5, 5], [6, 2], [6, 5], [0, 1], [0, 6] /* f5 */,
            
            // Fourth physical key row
            [7, 5], [1, 7], [1, 4], [2, 7], [2, 4], [3, 7], [3, 4], [4, 7],
            [4, 4], [5, 7], [5, 4], [6, 7], [6, 4], [0, 7], [0, 2], [0, 3] /* f7 */,
            
            // Fifth physical key row
            [7, 4] /* space */
        ]

key_translation_map =  
        {

    // First row
    Backspace:15,
    Enter:47,
    ArrowLeft:63,
    ArrowRight:63,
    F7:64,
    F8:64,
    F1:16,
    F2:16,
    F3:32,
    F4:32,
    F5:48,
    F6:48,
    ArrowUp:62,
    ArrowDown:62,
    
    // Second row
    Digit3: 3,
    KeyW:19,
    KeyA:35,
    Digit4:4,
    KeyZ:51,
    KeyS:36,
    KeyE:20,
    ShiftLeft:50,
    ShiftRight:50,
    
    // Third row
    Digit5:5,
    KeyR     :21,
    KeyD     :37,
    Digit6:6,
    KeyC     :53,
    KeyF     :38,
    KeyT     :22,
    KeyX     :52,
    
    // Fourth row
    Digit7:7,
    KeyY     :23,
    KeyG     :39,
    Digit8:8,
    KeyB     :55,
    KeyH     :40,
    KeyU     :24,
    KeyV     :54,
    
    // Fifth row
    Digit9:9,
    KeyI     :25,
    KeyJ     :41,
    Digit0:10,
    KeyM     :57,
    KeyK     :42,
    KeyO     :26,
    KeyN     :56,
    
    // Sixth row
    BracketRight:11, //plus
    KeyP     :27,
    KeyL     :43,
    //minus :12,
    period:59,
    colon :44,
    at    :28,
    Comma :58,
    
    // Seventh row
    pound :13,
    asterisk:29,
    semicolon:45,
    home  :14,
    rightShift:61,
    equal :46,
    upArrow   :30,
    slash :60,

    // Eights row
    Digit1:1,
    Delete :0,   //left arrow
    ControlLeft   :17,
    Digit2:2,
    Space :65,
    commodore :49,
    KeyQ     :18,
    runStop   :33,
    
    // Restore key
    restore   :31

        }        


