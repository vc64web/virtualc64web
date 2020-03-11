string msg_code[] {
    
    "MSG_NONE",
    
    // Running the emulator
    "MSG_READY_TO_RUN",
    "MSG_RUN",
    "MSG_HALT",

    // ROM and snapshot handling
    "MSG_BASIC_ROM_LOADED",
    "MSG_CHAR_ROM_LOADED",
    "MSG_KERNAL_ROM_LOADED",
    "MSG_VC1541_ROM_LOADED",
    "MSG_ROM_MISSING",
    "MSG_SNAPSHOT_TAKEN",

    // CPU related messages
    "MSG_CPU_OK",
    "MSG_CPU_SOFT_BREAKPOINT_REACHED",
    "MSG_CPU_HARD_BREAKPOINT_REACHED",
    "MSG_CPU_ILLEGAL_INSTRUCTION",
    "MSG_WARP_ON",
    "MSG_WARP_OFF",
    "MSG_ALWAYS_WARP_ON",
    "MSG_ALWAYS_WARP_OFF",

    // VIC related messages
    "MSG_PAL",
    "MSG_NTSC",

    // IEC Bus
    "MSG_IEC_BUS_BUSY",
    "MSG_IEC_BUS_IDLE",

    // Keyboard
    "MSG_KEYMATRIX",
    "MSG_CHARSET",
    
    // Peripherals (Disk drive)
    "MSG_VC1541_ATTACHED",
    "MSG_VC1541_ATTACHED_SOUND",
    "MSG_VC1541_DETACHED",
    "MSG_VC1541_DETACHED_SOUND",
    "MSG_VC1541_DISK",
    "MSG_VC1541_DISK_SOUND",
    "MSG_VC1541_NO_DISK",
    "MSG_VC1541_NO_DISK_SOUND",
    "MSG_VC1541_RED_LED_ON",
    "MSG_VC1541_RED_LED_OFF",
    "MSG_VC1541_MOTOR_ON",
    "MSG_VC1541_MOTOR_OFF",
    "MSG_VC1541_HEAD_UP",
    "MSG_VC1541_HEAD_UP_SOUND",
    "MSG_VC1541_HEAD_DOWN",
    "MSG_VC1541_HEAD_DOWN_SOUND",

    // Peripherals (Disk)
    "MSG_DISK_SAVED",
    "MSG_DISK_UNSAVED",
    
    // Peripherals (Datasette)
    "MSG_VC1530_TAPE",
    "MSG_VC1530_NO_TAPE",
    "MSG_VC1530_PROGRESS",

    // Peripherals (Expansion port)
    "MSG_CARTRIDGE",
    "MSG_NO_CARTRIDGE",
    "MSG_CART_SWITCH"

};
