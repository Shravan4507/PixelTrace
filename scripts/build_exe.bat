@echo off
title Build PixelTrace Standalone Executable
color 0E

echo ======================================================================
echo           BUILDING STANDALONE PIXELTRACE WINDOWS EXECUTABLE
echo ======================================================================
echo.

cd ..
python scripts\build_exe.py
pause

