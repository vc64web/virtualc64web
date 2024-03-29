// -----------------------------------------------------------------------------
// This file is part of VirtualC64
//
// Copyright (C) Dirk W. Hoffmann. www.dirkwhoffmann.de
// Licensed under the GNU General Public License v3
//
// See https://www.gnu.org for license information
// -----------------------------------------------------------------------------

#include "IO.h"
#include <vector>
#include <fstream>
#include <algorithm>
#include <assert.h>

namespace util {

string
lowercased(const string& s)
{
    string result;
    for (auto c : s) { result += (char)std::tolower(c); }
    return result;
}

string
uppercased(const string& s)
{
    string result;
    for (auto c : s) { result += (char)std::toupper(c); }
    return result;
}

string
extractPath(const string &s)
{
    auto idx = s.rfind('/');
    auto pos = 0;
    auto len = idx != string::npos ? idx + 1 : 0;
    return s.substr(pos, len);
}

string
extractName(const string &s)
{
    auto idx = s.rfind('/');
    auto pos = idx != string::npos ? idx + 1 : 0;
    auto len = string::npos;
    return s.substr(pos, len);
}

string
extractSuffix(const string &s)
{
    auto idx = s.rfind('.');
    auto pos = idx != string::npos ? idx + 1 : 0;
    auto len = string::npos;
    return s.substr(pos, len);
}

string
stripPath(const string &s)
{
    auto idx = s.rfind('/');
    auto pos = idx != string::npos ? idx + 1 : 0;
    auto len = string::npos;
    return s.substr(pos, len);
}

string
stripName(const string &s)
{
    auto idx = s.rfind('/');
    auto pos = 0;
    auto len = idx != string::npos ? idx : 0;
    return s.substr(pos, len);
}

string
stripSuffix(const string &s)
{
    auto idx = s.rfind('.');
    auto pos = 0;
    auto len = idx != string::npos ? idx : string::npos;
    return s.substr(pos, len);
}

string
appendPath(const string &path, const string &path2)
{
    if (path.empty()) {
        return path2;
    }
    if (path.back() == '/') {
        return path + path2;
    }
    return path + "/" + path2;
}

bool
isAbsolutePath(const string &path)
{
    return !path.empty() && path.front() == '/';
}

bool
fileExists(const string &path)
{
    return getSizeOfFile(path) >= 0;
}

bool
isDirectory(const string &path)
{
    struct stat fileProperties;
    
    if (stat(path.c_str(), &fileProperties) != 0)
        return false;
    
    return S_ISDIR(fileProperties.st_mode);
}

isize
numDirectoryItems(const string &path)
{
    isize count = 0;
    
    if (DIR *dir = opendir(path.c_str())) {
        
        struct dirent *dp;
        while ((dp = readdir(dir))) {
            if (dp->d_name[0] != '.') count++;
        }
    }
    
    return count;
}

std::vector<string>
files(const string &path, const string &suffix)
{
    std::vector <string> suffixes;
    if (suffix != "") suffixes.push_back(suffix);

    return files(path, suffixes);
}

std::vector<string>
files(const string &path, std::vector <string> &suffixes)
{
    std::vector<string> result;
    
    if (DIR *dir = opendir(path.c_str())) {
        
        struct dirent *dp;
        while ((dp = readdir(dir))) {
            
            string name = dp->d_name;
            string suffix = lowercased(extractSuffix(name));
            
            if (std::find(suffixes.begin(), suffixes.end(), suffix) != suffixes.end()) {
                result.push_back(name);
            }
        }
    }
    
    return result;
}

isize
getSizeOfFile(const string &path)
{
    struct stat fileProperties;
        
    if (stat(path.c_str(), &fileProperties) != 0)
        return -1;
    
    return (isize)fileProperties.st_size;
}

bool
matchingStreamHeader(std::istream &is, const u8 *header, isize len, isize offset)
{
    assert(header != nullptr);
    
    is.seekg(offset, std::ios::beg);
    
    for (isize i = 0; i < len; i++) {
        
        int c = is.get();
        if (c != (int)header[i]) {
            is.seekg(0, std::ios::beg);
            return false;
        }
    }
    is.seekg(0, std::ios::beg);
    return true;
}

bool
matchingStreamHeader(std::istream &is, const string &header, isize offset)
{
    return matchingStreamHeader(is, (u8 *)header.c_str(), header.length(), offset);
}

bool
matchingBufferHeader(const u8 *buffer, const u8 *header, isize len, isize offset)
{
    assert(buffer != nullptr);
    assert(header != nullptr);
    
    for (isize i = 0; i < len; i++) {
        if (buffer[offset + i] != header[i])
            return false;
    }

    return true;
}

bool
loadFile(const string &path, u8 **bufptr, isize *size)
{
    assert(bufptr); assert(size);

    std::ifstream stream(path);
    if (!stream.is_open()) return false;
    
    auto len = streamLength(stream);
    u8 *buf = new u8[len];
    stream.read((char *)buf, len);
    
    *bufptr = buf;
    *size = len;
    return true;
}

bool
loadFile(const string &path, const string &name, u8 **bufptr, isize *size)
{
    return loadFile(path + "/" + name, bufptr, size);
}

isize
streamLength(std::istream &stream)
{
    auto cur = stream.tellg();
    stream.seekg(0, std::ios::beg);
    auto beg = stream.tellg();
    stream.seekg(0, std::ios::end);
    auto end = stream.tellg();
    stream.seekg(cur, std::ios::beg);
    
    return (isize)(end - beg);
}

void
sprint8d(char *s, u8 value)
{
    for (int i = 2; i >= 0; i--) {
        
        u8 digit = value % 10;
        s[i] = '0' + digit;
        value /= 10;
    }
    s[3] = 0;
}

void
sprint8x(char *s, u8 value)
{
    for (int i = 1; i >= 0; i--) {
        
        u8 digit = value % 16;
        s[i] = (digit <= 9) ? ('0' + digit) : ('A' + digit - 10);
        value /= 16;
    }
    s[2] = 0;
}

void
sprint8b(char *s, u8 value)
{
    for (int i = 7; i >= 0; i--) {
        
        s[i] = (value & 0x01) ? '1' : '0';
        value >>= 1;
    }
    s[8] = 0;
}

void
sprint16d(char *s, u16 value)
{
    for (int i = 4; i >= 0; i--) {
        
        u8 digit = value % 10;
        s[i] = '0' + digit;
        value /= 10;
    }
    s[5] = 0;
}

void
sprint16x(char *s, u16 value)
{
    for (int i = 3; i >= 0; i--) {
        
        u8 digit = value % 16;
        s[i] = (digit <= 9) ? ('0' + digit) : ('A' + digit - 10);
        value /= 16;
    }
    s[4] = 0;
}

void
sprint16b(char *s, u16 value)
{
    for (int i = 15; i >= 0; i--) {
        
        s[i] = (value & 0x01) ? '1' : '0';
        value >>= 1;
    }
    s[16] = 0;
}

std::ostream &
dec::operator()(std::ostream &os) const
{
    os << std::dec << value;
    return os;
};

std::ostream &
hex::operator()(std::ostream &os) const
{
    os << std::hex << "0x" << std::setw(digits) << std::setfill('0') << value;
    return os;
};

std::ostream &
tab::operator()(std::ostream &os) const {
    os << std::setw(pads) << std::right << std::setfill(' ') << str << " : ";
    return os;
}

std::ostream &
bol::operator()(std::ostream &os) const {
    os << (value ? str1 : str2);
    return os;
}

const string &bol::yes = "yes";
const string &bol::no = "no";

}
