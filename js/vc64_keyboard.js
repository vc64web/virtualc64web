var shift_pressed_count=0;
function translateKey(keycode, key)
{
    console.log('keycode='+keycode + ', key='+key);
    var mapindex;
    var sym_key = symbolic_map[key.toLowerCase()];
    var c64code;
    if(sym_key!== undefined) // && !Array.isArray(sym_key))
    {//if there is a symbolic mapping ... use it instead of the positional mapping
        var raw_key_with_modifier=create_key_composition(sym_key);
        c64code=raw_key_with_modifier.raw_key;
    } 
    else
    {//when there is no symbolic mapping fall back to positional mapping
        mapindex=key_translation_map[ keycode ];
        c64code=c64keymap[mapindex];
    }
    return c64code;
}

function isUpperCase(s){
    return s.toUpperCase() == s && s.toLowerCase() != s;
}

function translateKey2(keycode, key, use_positional_mapping=false)
{
    console.log('keycode='+keycode + ', key='+key);
    if(keycode == 'Space' && key == '^')
    {//fix for windows system
        key=' ';
    }

    let mapindex;
    let raw_key_with_modifier = { modifier: null,  raw_key: undefined }

    if(use_positional_mapping)
    {
        mapindex=key_translation_map[ keycode ];
        raw_key_with_modifier.raw_key = c64keymap[mapindex];
    }
    else
    {
        let sym_key = symbolic_map[key];
        if(sym_key === undefined && isUpperCase(key))
        {//get the lowercase variant and press shift
            sym_key = symbolic_map[key.toLowerCase()];
            if(!Array.isArray(sym_key))
            {
                sym_key = ['ShiftLeft', sym_key];
            }
        }

        if(sym_key!== undefined)
        {
            raw_key_with_modifier = create_key_composition(sym_key);
        } 
        else
        {
            mapindex=key_translation_map[ keycode ];
            raw_key_with_modifier.raw_key = c64keymap[mapindex];
        }
    }


    return raw_key_with_modifier.raw_key === undefined ?
            undefined:
            raw_key_with_modifier;
}


function create_key_composition(entry_from_symbolic_map)
{
    var mapindex;
    var raw_key_with_modifier = { modifier: null,  raw_key: null };

    if(Array.isArray(entry_from_symbolic_map))
    {
        mapindex=key_translation_map[ entry_from_symbolic_map[0] ];
        raw_key_with_modifier.modifier = c64keymap[mapindex];

        mapindex=key_translation_map[ entry_from_symbolic_map[1] ];
        raw_key_with_modifier.raw_key = c64keymap[mapindex];
    }
    else
    {
        mapindex=key_translation_map[ entry_from_symbolic_map];
        raw_key_with_modifier.raw_key = c64keymap[mapindex];
    }
    return raw_key_with_modifier;
}


symbolic_map = {
    a: 'KeyA',
    b: 'KeyB',
    c: 'KeyC',
    d: 'KeyD',
    e: 'KeyE',
    f: 'KeyF',
    g: 'KeyG',
    h: 'KeyH',
    i: 'KeyI',
    j: 'KeyJ',
    k: 'KeyK',
    l: 'KeyL',
    m: 'KeyM',
    n: 'KeyN',
    o: 'KeyO',
    p: 'KeyP',
    q: 'KeyQ',
    r: 'KeyR',
    s: 'KeyS',
    t: 'KeyT',
    u: 'KeyU',
    v: 'KeyV',
    w: 'KeyW',
    x: 'KeyX',
    z: 'KeyZ',
    y: 'KeyY',

    F1: 'F1',
    F2: ['ShiftLeft','F1'],
    F3: 'F3',
    F4: ['ShiftLeft','F3'],
    F5: 'F5',
    F6: ['ShiftLeft','F5'],
    F7: 'F7',
    F8: ['ShiftLeft','F7'],
    ',': 'Comma',
    '*': 'BracketRight', 
    "1": 'Digit1',
    "2": 'Digit2',
    "3": 'Digit3',
    "4": 'Digit4',
    "5": 'Digit5',
    "6": 'Digit6',
    "7": 'Digit7',
    "8": 'Digit8',
    "9": 'Digit9',
    "0": 'Digit0',
    ' ': 'Space',
    ':': 'Semicolon',
    '.': 'Period',
    ';': 'Quote',
    '=': 'Backslash', 
    '!': ['ShiftLeft','Digit1'],
    '"': ['ShiftLeft','Digit2'],
    '#': ['ShiftLeft','Digit3'],
    '§': ['ShiftLeft','Digit3'],
    '$': ['ShiftLeft','Digit4'],
    '%': ['ShiftLeft','Digit5'],
    '&': ['ShiftLeft','Digit6'],
    "'": ['ShiftLeft','Digit7'],
    '(': ['ShiftLeft','Digit8'],
    ')': ['ShiftLeft','Digit9'],
    '+': 'Minus',
    '/': 'Slash',
    '?':  ['ShiftLeft','Slash'],
    '-': 'Equal',
    '@': 'BracketLeft',
    '[': ['ShiftLeft','Semicolon'],
    ']': ['ShiftLeft','Quote'],
    '<': ['ShiftLeft','Comma'],
    '>': ['ShiftLeft','Period'],
    'shiftrunstop': ['ShiftLeft','runStop'],   //load from tape shortcut
    'ArrowLeft': ['ShiftLeft','ArrowRight'],
    'ArrowUp': ['ShiftLeft','ArrowDown'],
    '\n': 'Enter',
    'Dead': 'upArrow', '^': 'upArrow' //^
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
    ShiftRight:50,
    ShiftLeft:50,
    
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
    Minus:11,  //plus
    KeyP     :27,
    KeyL     :43,
    Equal :12, //minus
    Period:59, 
    Semicolon :44, //colon
    BracketLeft :28, //@
    Comma :58,
    
    // Seventh row
    pound :13,
    BracketRight:29, //asterisk
    Quote:45,  //semicolon
    home  :14,
    rightShift:61,
    Backslash :46, //equal
    upArrow :30,
    Slash :60,

    // Eights row
    Digit1:1,
    Delete :0,   //left arrow
    ControlLeft   :17,
    Digit2:2,
    Space :65,
    commodore :49,  //commodore
    commodore :49,  //commodore
    KeyQ     :18,
    runStop   :33,
    
    // Restore key
    restore   :31

}        



function reset_keyboard()
{
    document.body.setAttribute('lowercase', 'false');
    document.body.setAttribute('cbm-key', '');
    document.body.setAttribute('shift-keys', '');
    document.body.setAttribute('ctrl-key', '');
    document.body.setAttribute('ShiftLeft-key', '');
    document.body.setAttribute('rightShift-key', '');
    document.body.setAttribute('ShiftLock-key', '');
    shift_pressed_count=0;
}


function installKeyboard() {  
    reset_keyboard();

    //lc = lowercase, slc= shift+lowercase, cbm_lc = commodore+lowercase
    //todo:lc, cbm_lc
    keymap= [ 
    [{k:'hide', c:'hide_keyboard',cls:'smallkey', style:'padding-top:0px'},{k:'ABC', c:'uppercase',cls:'case_switch upper_case'},{k:'abc', c:'lowercase',cls:'case_switch lower_case'},{style:'width:10px;'}/*,{k:'!',c:'exclama',sym:'!',cls:'smallkey'},{k:'"',c:'quot',sym:'"',cls:'smallkey'},{k:'#',c:'hash',sym:'#',cls:'smallkey'},{k:'$',c:'dollar',sym:'$',cls:'smallkey'}*/,{style:'width:10px'},{k:'F1',c:'F1',cls:'darkkey'}, {k:'F2',c:'F2',cls:'darkkey'},{k:'F3',c:'F3',cls:'darkkey'},{k:'F4',c:'F4',cls:'darkkey'},{k:'F5',c:'F5',cls:'darkkey'},{k:'F6',c:'F6',cls:'darkkey'},{k:'F7',c:'F7',cls:'darkkey'},{k:'F8',c:'F8',cls:'darkkey'}],
    [{k:'\u{2190}',c:'Delete',style:'font-weight:bold'}, {k:'1',sk:'!', c:'Digit1',cbm:'ORG',ctrl:'BLK'},{k:'2', sk:'\"', c:'Digit2', cbm:'BRN', ctrl:'WHT'},{k:'3',sk:'#',c:'Digit3', cbm:'PNK', ctrl:'RED'},{k:'4',sk:'$',c:'Digit4', cbm:'DRK<br>GRY', ctrl:'CYN'},{k:'5',sk:'%',c:'Digit5',cbm:'GRY', ctrl:'PUR'},{k:'6',sk:'&',c:'Digit6', cbm:'LGHT<br>GRN', ctrl:'GRN'},{k:'7',sk:"'",c:'Digit7', cbm:'LGHT<br>BLU', ctrl:'BLU'},{k:'8',sk:'(',c:'Digit8', cbm:'LGHT<br>GRY', ctrl:'YEL'},{k:'9',sk:')',c:'Digit9', ctrl:'RVS<br>ON'},{k:'0',c:'Digit0', ctrl:'RVS<br>OFF', cls:'key0'},{k:'+', p:'\u{253c}', cbm:'\u{2592}' ,c:'Minus'},{k:'-', p:'\u{2502}', cbm:'\u{e0dc}', c:'Equal'},{k:'\u{00a3}', p:'\u{25e4}', cbm:'\u{e0a8}', c:'pound'},{k:'Home', sk:'CLR', c:'home', cls:'small',style:'font-size:x-small;height:40px;padding-top:4px;'},{k:'DEL', sk:'INST',c:'Backspace',cls:'small',style:'font-size:x-small;height:40px;padding-top:4px;'} ], 
    [{style:'width:34px'},{k:'CTRL',c:'ControlLeft', cls:'ctrl'}, {k:'Q', p:'\u{2022}',cbm:'\u{251c}' },{k:'W', p:'\u{25cb}',cbm:'\u{2524}'},{k:'E', p:'\u{e0c5}',cbm:'\u{2534}'},{k:'R', p:'\u{e072}',cbm:'\u{252c}'},{k:'T', p:'\u{e0d4}',cbm:'\u{2594}'},{k:'Y', p:'\u{e0d9}',cbm:'\u{e0b7}'},{k:'U', p:'\u{256d}',cbm:'\u{e0b8}'},{k:'I', p:'\u{256e}',cbm:'\u{2584}'},{k:'O', p:'\u{e0cf}',cbm:'\u{2583}'},{k:'P', p:'\u{e0d0}',cbm:'\u{2582}'},{k:'@',c:'BracketLeft',slc:'\u{e1fa}',p:'\u{e0ba}', cbm:'\u{2581}'},{k:'*', c:'BracketRight', p:'\u{2500}', cbm:'\u{25e5}', cbm_lc:'\u{e17f}'},{k:'\u{2191}',p:'\u{03C0}',cbm:'\u{03C0}',lc:'\u{e1de}',c:'upArrow'},{k:'RESTORE', c:'restore',style:'font-size:small'}], 
    [{k:'Run<br>Stop',c:'runStop', cls:'smallfont'},{k:'Shift<br>Lock', c:'shiftlock', cls:'ShiftLock', style:'font-size:x-small'},{k:'A',p:'\u{2660}', cbm:'\u{250c}'},{k:'S',p:'\u{2665}',cbm:'\u{2510}'},{k:'D',p:'\u{e064}',cbm:'\u{2597}'},{k:'F',p:'\u{e0c6}',cbm:'\u{2596}'},{k:'G',p:'\u{e0c7}',cbm:'\u{258e}'},{k:'H',p:'\u{e0c8}',cbm:'\u{258e}'},{k:'J',p:'\u{2570}',cbm:'\u{258d}'},{k:'K',p:'\u{256f}',cbm:'\u{258c}'},{k:'L',p:'\u{e0cc}',cbm:'\u{e0b6}'},{k:':',sk:'[',c:'Semicolon'},{k:';',sk:']', c:'Quote'},{k:'=', c:'Backslash'},{k:'RETURN',c:'Enter',style:'font-size: small'}], 
    [{k:'C=', c:'commodore', cls:'cbm'},{k:'\u{21e7}',c:'ShiftLeft', cls:'ShiftLeft', style:'padding-right:30px'},{k:'Z', p:'\u{2666}',cbm:'\u{2514}'},{k:'X',p:'\u{2663}',cbm:'\u{2518}'},{k:'C',p:'\u{2500}',cbm:'\u{259d}'},{k:'V',p:'\u{2573}',cbm:'\u{2598}'},{k:'B',p:'\u{2502}',cbm:'\u{259a}'},{k:'N',p:'\u{2571}',cbm:'\u{e0aa}'},{k:'M',p:'\u{2572}',cbm:'\u{e0a7}'},{k:',',sk:'<',c:'Comma'},{k:'.',sk:'>',c:'Period'},{k:'/',sk:'?', c:'Slash'},{k:'\u{21e7}',c:'rightShift', cls:'rightShift',style:"padding-right:30px"},{style:'width:12px'}, {k:'\u{2191}',c:'UP',sym:'ArrowUp'},{style:'width:31px'} ],
    [{style:'width:160px'},{k:'', c:'Space', style:'width:401px',cls:'smallkey'},{style:'width:32px'}, {k:'\u{2190}',c:'left',sym:'ArrowLeft',cls:'smallkey'},{k:'\u{2193}', c:'ArrowDown',cls:'smallkey'},{k:'\u{2192}', c:'ArrowRight',cls:'smallkey'},{style:'width:34px'}]
    ];
    var the_keyBoard='';
    keymap.forEach(row => {
        the_keyBoard+='<div class="justify-content-center" style="display:flex">';
        row.forEach(keydef => {
            if(keydef.k === undefined)
            {
                var style = "";
                if(keydef.s !== undefined)
                    css = keydef.s; 
                if(keydef.style !== undefined)
                    style = keydef.style; 
                
                the_keyBoard +='<div class="'+css+'" style="'+style+'"></div>';
            }
            else
            {
                let cbm_petscii='';
                if(keydef.cbm !== undefined)
                {
                    cbm_petscii =`<div class="keycap_cbm" key-label="${keydef.cbm}">${keydef.cbm}</div>`;
                }

                let shift_petscii='';
                if(keydef.p !== undefined)
                {
                    shift_petscii =`<div class="keycap_p">${keydef.p}</div>`;
                }

                let ctrl_color='';
                if(keydef.ctrl !== undefined)
                {
                    ctrl_color =`<div class="keycap_clr">${keydef.ctrl}</div>`;
                }

                let shift_lowercase='';
                if(keydef.slc !== undefined)
                {
                    shift_lowercase =`<div class="keycap_slc">${keydef.slc}</div>`;
                }
                let k_lowercase='';
                if(keydef.k.length==1 && keydef.k != keydef.k.toLowerCase())
                {
                    k_lowercase =`<div class="keycap_lc">${keydef.k.toLowerCase()}</div>`;
                }



                let cls = '';
                if(keydef.cls !== undefined)
                {
                    cls=keydef.cls;
                }
                if(keydef.c === undefined)
                    keydef.c = 'Key'+keydef.k;
                var css = `btn btn-secondary ml-1 mt-1 ${cls}`;
                
                var style = null; 
                if(keydef.css !== undefined)
                    css = keydef.css; 
                if(keydef.style !== undefined)
                    style = keydef.style; 

                let label = keydef.k;
                if(label == "hide")
                {
                    label = `<svg xmlns="http://www.w3.org/2000/svg" width="2.0em" height="2.0em" fill="currentColor" class="bi bi-pause-btn" viewBox="0 0 16 16"><path d="M14 5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h12zM2 4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H2z"/><path d="M13 10.25a.25.25 0 0 1 .25-.25h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25v-.5zm0-2a.25.25 0 0 1 .25-.25h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25v-.5zm-5 0A.25.25 0 0 1 8.25 8h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5A.25.25 0 0 1 8 8.75v-.5zm2 0a.25.25 0 0 1 .25-.25h1.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-1.5a.25.25 0 0 1-.25-.25v-.5zm1 2a.25.25 0 0 1 .25-.25h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25v-.5zm-5-2A.25.25 0 0 1 6.25 8h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5A.25.25 0 0 1 6 8.75v-.5zm-2 0A.25.25 0 0 1 4.25 8h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5A.25.25 0 0 1 4 8.75v-.5zm-2 0A.25.25 0 0 1 2.25 8h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5A.25.25 0 0 1 2 8.75v-.5zm11-2a.25.25 0 0 1 .25-.25h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25v-.5zm-2 0a.25.25 0 0 1 .25-.25h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25v-.5zm-2 0A.25.25 0 0 1 9.25 6h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5A.25.25 0 0 1 9 6.75v-.5zm-2 0A.25.25 0 0 1 7.25 6h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5A.25.25 0 0 1 7 6.75v-.5zm-2 0A.25.25 0 0 1 5.25 6h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5A.25.25 0 0 1 5 6.75v-.5zm-3 0A.25.25 0 0 1 2.25 6h1.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-1.5A.25.25 0 0 1 2 6.75v-.5zm0 4a.25.25 0 0 1 .25-.25h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25v-.5zm2 0a.25.25 0 0 1 .25-.25h5.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-5.5a.25.25 0 0 1-.25-.25v-.5z"/></svg>`;
                }
                
                let shift_label=null;
                if(typeof keydef.sk !== 'undefined')
                {
                    shift_label=keydef.sk;
                }

                the_keyBoard +=`<button type="button" id="button_${keydef.c}" class="vbk_key ${css}"`;
                if(shift_label!= null)
                {
                    let style_composite_key=";padding-top:0;padding-bottom:0;";
                    if(style==null)
                        style=style_composite_key;
                    else
                        style+=style_composite_key;
                }
                if(style !=null)
                    the_keyBoard += ' style="'+style+'"';
                the_keyBoard+='>';

                let keycap=`<div class="keycap">${label}</div>`;
                let keycap_shift=`<div class="keycap_shift">${shift_label}</div>`;
                let has_cbm_petscii=cbm_petscii.length>0 ?"has_cbm_petscii":"";
                let has_shift_petscii=shift_petscii.length>0 ?"has_shift_petscii":"";
                let has_lowercase=k_lowercase.length>0 ?"has_lowercase":"";
                let has_slc=shift_lowercase.length>0 ?"has_slc":"";
                let has_clr=ctrl_color.length>0 ?"has_clr":"";

                if(shift_label==null)
                {
                    the_keyBoard += `<div class="${has_cbm_petscii} ${has_shift_petscii} ${has_lowercase} ${has_slc} ${has_clr}">${keycap}${k_lowercase}${cbm_petscii}${shift_petscii}${shift_lowercase}${ctrl_color}</div>`;
                }
                else
                {
                    the_keyBoard+= `<div class="composite ${has_cbm_petscii} ${has_lowercase} ${has_slc} ${has_clr}" style="flex-direction:column">${keycap_shift}${keycap}${k_lowercase}${cbm_petscii}${ctrl_color}</div>`;
                }

                the_keyBoard+='</button>';
            }
        });
        the_keyBoard+='</div>';
    });
    $('#divKeyboardRows').html(the_keyBoard);

    release_modifiers= function()
    {
        if(document.body.getAttribute('ctrl-key')=='pressed')
        {
            let c64code = translateKey('ControlLeft', 'CTRL');
            wasm_schedule_key(c64code[0], c64code[1], 0,1);
            $("#button_ControlLeft").attr("style", "");
            document.body.setAttribute('ctrl-key','');
        }
        if(document.body.getAttribute('cbm-key')=='pressed')
        {
            let c64code = translateKey('commodore', 'C=');
            wasm_schedule_key(c64code[0], c64code[1], 0,1);
            $("#button_commodore").attr("style", "");
            document.body.setAttribute('cbm-key','');
        }
        
        if(document.body.getAttribute('ShiftLeft-key')=='pressed')
        {
            let c64code = translateKey('ShiftLeft', 'ShiftLeft');
            
            if(document.body.getAttribute('ShiftLock-key')!='pressed')
                wasm_schedule_key(c64code[0], c64code[1], 0,1);
            
            document.body.setAttribute('ShiftLeft-key', '');
            shift_pressed_count--;
            if(shift_pressed_count==0)
            {
                document.body.setAttribute('shift-keys', '');
            }
        }
        if(document.body.getAttribute('rightShift-key')=='pressed')
        {
            let c64code = translateKey('rightShift', 'rightShift');
            wasm_schedule_key(c64code[0], c64code[1], 0,1);
            document.body.setAttribute('rightShift-key', '');
            shift_pressed_count--;
            if(shift_pressed_count==0)
            {
                document.body.setAttribute('shift-keys', '');
            }
        }
    }

    let virtual_keyboard = document.getElementById("virtual_keyboard");
    virtual_keyboard.addEventListener("contextmenu", (event)=>{event.preventDefault();});
    virtual_keyboard.addEventListener("dragstart", (event)=>{event.preventDefault();});
    virtual_keyboard.addEventListener("drop", (event)=>{event.preventDefault();});
    virtual_keyboard.addEventListener("select", (event)=>{event.preventDefault();});

    $('#virtual_keyboard').css("user-select","none");
    
    keymap.forEach(row => {
        row.forEach(keydef => {
            if(keydef.k === undefined)
                return;
            if(keydef.c === undefined)
              keydef.c = 'Key'+keydef.k;

            let the_key_element=document.getElementById("button_"+keydef.c);
            
            let key_down_handler=function() 
            {
               if(keydef.c == 'hide_keyboard')
               {
                    $('#virtual_keyboard').collapse('hide');
                    setTimeout( scaleVMCanvas, 500);
               }
               else if(keydef.c == 'lowercase')
               {
                   document.body.setAttribute('lowercase', 'true');
               }
               else if(keydef.c == 'uppercase')
               {
                   document.body.setAttribute('lowercase', 'false');
               }
               else if(keydef.c == 'shiftlock')
               {
                   let c64code = translateKey('ShiftLeft', 'ShiftLeft');
                   if(document.body.getAttribute('ShiftLock-key')!='pressed')
                   {
                     wasm_schedule_key(c64code[0], c64code[1], 1,0);                   
                     document.body.setAttribute('shift-keys', 'pressed');
                     document.body.setAttribute('ShiftLock-key', 'pressed');
                     shift_pressed_count++;
                   }
                   else
                   {
                     wasm_schedule_key(c64code[0], c64code[1], 0, 0);                   
                     document.body.setAttribute('ShiftLock-key', '');
                     shift_pressed_count--;
                     if(shift_pressed_count==0)
                     {
                        document.body.setAttribute('shift-keys', '');
                     }              
                   }
               }
               else if(keydef.sym !== undefined)
               {
                   emit_string([keydef.sym],0);
               } 
               else
               {
                var c64code = translateKey(keydef.c, keydef.k);
                if(c64code !== undefined){
                    wasm_schedule_key(c64code[0], c64code[1], 1,0);

                    if(keydef.c == 'ShiftLeft' ||keydef.c == 'rightShift')
                    {
                        if(document.body.getAttribute(keydef.c+'-key')=='')
                        {
                            document.body.setAttribute('shift-keys', 'pressed');
                            document.body.setAttribute(keydef.c+'-key', 'pressed');
                            shift_pressed_count++;
                        }
                        else
                        {
                        //setTimeout(() => {
                            document.body.setAttribute(keydef.c+'-key', '');
                            wasm_schedule_key(c64code[0], c64code[1], 0,1);
                            shift_pressed_count--;
                            if(shift_pressed_count==0)
                            {
                               document.body.setAttribute('shift-keys', '');
                            }   
                        //}, 1000*4);
                        }
                    }
                    else if(keydef.c == 'commodore')
                    {
                        if(document.body.getAttribute('cbm-key')=='')
                        {
                            document.body.setAttribute('cbm-key', 'pressed');
                        }
                        else
                        {
                      //  setTimeout(() => {
                            document.body.setAttribute('cbm-key', '');
                            wasm_schedule_key(c64code[0], c64code[1], 0,1);
                     //   }, 1000*4);
                        }
                    }
                    else if(keydef.c == 'ControlLeft')
                    {
                        if(document.body.getAttribute('ctrl-key')=='')
                        {
                            document.body.setAttribute('ctrl-key', 'pressed');
                        }
                        else
                        {
                        //setTimeout(() => {
                            document.body.setAttribute('ctrl-key', '');
                            wasm_schedule_key(c64code[0], c64code[1], 0,1);
                        //}, 1000*4);
                        }
                    }
                    else if(keydef.c == 'runStop')
                    {
                        $("#button_"+keydef.c).attr("style", "background-color: var(--red) !important");
                    
                        setTimeout(() => {
                            wasm_schedule_key(c64code[0], c64code[1], 0, 1);
                            $("#button_"+keydef.c).attr("style", "");
                        }, 1000*4);
                    
                    }
                    else
                    {
                        the_key_element.setAttribute('key-state', 'pressed');
                    }
                }
               }
            }

            let key_up_handler=function() 
            {
                if( keydef.c == 'CapsLock' ||
                    keydef.c == 'ShiftLeft' || keydef.c == 'rightShift' ||
                    keydef.c == 'ControlLeft' ||
                    keydef.c == 'commodore'
                )
                {}
                else
                {
                    let c64code = translateKey(keydef.c, keydef.k);
                    wasm_schedule_key(c64code[0], c64code[1], 0, 1);
                    release_modifiers();
                    the_key_element.setAttribute('key-state', '');
                }
            }

            the_key_element.addEventListener("focus", (event)=>{ event.preventDefault(); event.currentTarget.blur();})
            the_key_element.addEventListener("mousedown", key_down_handler);
            the_key_element.addEventListener("mouseup", key_up_handler);

            the_key_element.addEventListener("touchstart", (event)=>{
                if(current_vbk_touch.startsWith("exact") || current_vbk_touch.startsWith("mix"))
                {
                    event.preventDefault(); 
                    key_down_handler();
                }
                if(current_vbk_touch.startsWith("mix"))
                {
                    let scroll_area=document.getElementById("vbk_scroll_area");
                    touch_start_x=event.changedTouches[0].clientX;
                    touch_start_scrollLeft=scroll_area.scrollLeft;
                    touch_start_id=event.changedTouches[0].identifier;
                }
            });
            the_key_element.addEventListener("touchmove", (event)=>{
                if(current_vbk_touch.startsWith("mix"))
                {
                    let scroll_area=document.getElementById("vbk_scroll_area");
                    for(touch of event.changedTouches)
                    {
                        if(touch.identifier == touch_start_id)
                        {
                            let scroll_x = touch_start_scrollLeft+(touch_start_x-touch.clientX);
                            scroll_area.scroll(scroll_x, 0);
                        }
                    }
                } 
            });
            the_key_element.addEventListener("touchend", (event)=>{
                event.preventDefault(); 
                if(current_vbk_touch.startsWith("smart"))
                {
                    key_down_handler();
                    setTimeout(key_up_handler,100); 
                }
                else
                {
                    key_up_handler(); 
                }
            });


        });
    });


}


