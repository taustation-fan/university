# Announcing the Tau Station Education Manager

I am pleased to announce the community [Tau Station Education Manager](https://education.tauguide.de/).

On the surface, it just looks like a list of courses, which in itself is already pretty useful.

But there is more:

* You can sort by a column on clicking on the column heading. You can sort by two columns
  by pressing the Shift key while clicking on the second column.
* You can filter by availability at a specific station by clicking on the check box in that
  station's column header.
* You can filter by module and course description through the search box at the top
* When you click on a course name, a pop-up opens that shows the description, a list
  of prerequisites (and their prerequisites, transitively), sorted in a way that you can
  take them in the same order. In addition, some courses are annotated with community-supplied
  measurements. For example *Advanced Fuel Efficiency* has the extra information "Reduces fuel consumption by 10%".

## Course Management

But wait, there is even more!

When you tell the page which courses you have completed, it can do much more for you.

Go to [your character page](https://alpha.taustation.space/), and copy the contents of the
*Education* section, starting from *Enrolled in*. Then go to the [bottom of the education
manager page](https://education.tauguide.de/#education-input), and paste the previously copied
text there, and click on *Apply*.

Now the Status column of the course list shows ✔ for finished courses, ⌚ for courses in progress,
✖ for courses that are not yet available due to missing prerequisites, and nothing for courses
your are eligible for.

The filter at the top, which defaults to "Show all", can now be used to filter the list by course
state, which is very useful for planning your further education.

The course state in stored purely in your browser, and is automatically
loaded when you visit the page on a later date.

When a course finishes, you can either re-import the current state from your profile page,
or manually set the course state in each course's detail view.

## Use Cases

Let's look at some possible use cases, and how to use the manager to help you with them.

### I am poor, which courses can I take right now?

Filter by courses you are eligible for. Then click on *Cost* column to sort by cost, and
look at the courses on the top of the list.

### I am on Moissan Station, and my current course finished. Which one can I take here?

Filter by courses you are eligible for. Then select the check box below the
column heading *Moi*, short for Moissan.

### I want to do *Ship Maintenance Master*. How do I get there?

Click on the course name. The pop-up shows a list of prerequisites, along with their status,
for example:

* Introduction to Engineering [Done]
* Item repair 1 [Done]
* Item repair 2 [Done]
* Item repair 3 [In Progress]
* Introduction to Ship Engineering
* Basic Ship Maintenance
* Advanced Ship Maintenance

You can see that *Introduction to Ship Engineering* is the next course to take. Click on
the course name to see where it is available.

# Acknowledgements

The education manager has truly been a community project, with code contributions from

* moritz
* Perleone
* duelafn
* particle
* quasidart
* Azure-Wolf

and data contributions from

* Shadow
* Perleone
* moritz
* Dotsent
* duelafn
* Azure-Wolf

... and possibly others whose contributions I forgot to track. My apologies.

The [source code lives on GitHub](https://github.com/taustation-fan/university/), and
we welcome contributions from everybody.
