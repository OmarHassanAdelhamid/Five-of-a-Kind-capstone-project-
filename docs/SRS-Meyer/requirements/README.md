# Software Requirements Specification (SRS)

This document utilizes Dr. Mosser's implementation of the Meyer's template for Requirements Specifications.

The important folders and files for this folder are as follows:
- ```parts``` Contains AsciiDoctor files for each of the sections of the final document, hierarchically organized.
- ```models``` Contains any UML diagrams included in the document, as well as any associated files.
- ```Makefile``` Build configuration for AsciiDoctor
- ```README.md``` Short overview of this documentation
- ```SRS.pdf``` The final documentation generated from all AsciiDoctor files.

This document contains all defined requirements, and includes further information about goals & stakeholders, detailed development plans, and traces between requirements and other sections of documentation.

Usage: Run ```make pdf``` to regenerate documentation as ```index.pdf```. Rename and replace SRS.pdf with this generated file.
