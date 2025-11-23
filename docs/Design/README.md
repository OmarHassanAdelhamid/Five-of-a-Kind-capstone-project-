# Design Documentation

The folders within this folder are as follows:

- ```SoftArchitecture``` Contains Module Guide documentation; a high level overview of the breakdown of the project into self-contained modules. Explains what secret each module holds, their trace to requirements, and the use hierarchy between modules.
- ```SoftDetailedDes``` Contains Module Interface Specification documentation; a lower-level overview of the modules detailed in the MG. Explains in greater detail the variables and routines associated with each module, outside of language-specific technical details.

Each of the above folders contain the same structure as other folders within docs; a makefile, as well as ```.tex``` and ```.pdf``` for each document are included in each.

Usage: Run ```make``` in each prospective folder to regenerate the associated documentation.
