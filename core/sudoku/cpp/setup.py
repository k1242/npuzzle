from setuptools import setup, Extension
import pybind11

ext_modules = [
    Extension(
        "hsolve",
        [
            "pybind.cpp",
            "solver.cpp", 
            "tech_base.cpp",
            "tech_wing.cpp",
            "tech_recelim.cpp",
            "utils.cpp"
        ],
        include_dirs=[pybind11.get_include(), ".", "/usr/include/c++/13", "/usr/include/x86_64-linux-gnu/c++/13"],
        language="c++",
        extra_compile_args=["-std=c++20", "-Ofast", "-march=native"],
    ),
]

setup(
    name="sudoku_solver",
    version="0.1.0",
    description="Sudoku solver without backtracking",
    ext_modules=ext_modules,
    zip_safe=False,
)