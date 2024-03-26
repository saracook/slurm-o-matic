(function($, window) {

  var SlurmOMatic = {
    init: function() {
      //;
      this.renderUI();
    },
    renderUI: function() {
      handleGPU(null);
      checkSessionsStartup();
      collapseResourceTableSession()
      var config = {};
      var i;
      var j;
      var queueLength;
      $.getJSON("includes/config.json", function(data) {
        config = data;
        queueLength = config.queues.length;
        populateFakeGpu(config);
        //console.log('new config', config);
        queueLength = config.queues.length;
        populateResourceTable(config);
        populateQueueRadio(config);
        populateGpuRadio(config);
        populateModules(config);
        populateResourceDropdowns(config);
        populateTimeDropdowns();
        generateScript();
        return;
      }).fail(function(e) {
        //console.log("An error has occurred.", e);
      });

      function populateResourceTable(config) {
        var $tableBody = $('#resource-table tbody');
        for (i = 0; i < queueLength; i++) {
          if (config.queues[i].showTable) { //skip if this is fake
            var tableRow = $('<tr>');
            $("<td>").html(config.queues[i].name).appendTo(tableRow);
            $("<td>").html(config.queues[i].cpu).appendTo(tableRow);
            $("<td>").html(config.queues[i].memory).appendTo(tableRow);
            $("<td>").html(config.queues[i].displayNodes).appendTo(tableRow);
            $("<td>").html(config.queues[i].gpus).appendTo(tableRow);
            $tableBody.append(tableRow);
          }
        }

        $('.table-toggle').click(function() {
          $(this).find('i').toggleClass('fas fa-plus fas fa-minus');
          if (hasClass(this, 'collapsed')) {
            sessionStorage.setItem('table-toggle', '');
          } else {
            sessionStorage.setItem('table-toggle', 'collapsed');
          }
        });
      }

      function collapseResourceTableSession() {
        var tableToggle = checkSession('table-toggle');
        if (tableToggle) {
          $('#resource-table').collapse();
          var tableToggleIcon = $('.table-toggle i');
          var showIcon = "fa-plus";
          var hideIcon = "fa-minus";
          tableToggleIcon.addClass(showIcon).removeClass(hideIcon);
        }

      }

      function populateQueueRadio(config) {
        var $queueList = $('#choose-queue');
        //var queueLength = config.queues.length;
        const uniqueArr = [];

        for (i = 0; i < queueLength; i++) {
          if (uniqueArr.indexOf(config.queues[i].name) === -1) {
            uniqueArr.push(config.queues[i].name);
          }
        }

        for (i = 0; i < uniqueArr.length; i++) {
          var queueRow = $('<div class="form-check">');
          var queueRadio = $('<input type="radio" class="queue_radio form-check-input" name="queue">');
          queueRadio.val(uniqueArr[i]);
          queueRadio.appendTo(queueRow);
          $('<label class="form-check-label">').html(uniqueArr[i]).appendTo(queueRow);
          $queueList.append(queueRow);
        }
        //select the first radio, so the user doesn't see a bunch of nonsense in the script box
        $('#choose-queue .queue_radio').first().prop("checked", true)
      }

      //This uses the values in config to populate the dropdowns to match the selected queue
      function populateResourceDropdowns(config) {
        var queue = $('.queue_radio:checked').val();
        handleGPU(queue);
        var gpuSpec = $('.gpu-flag-radio:checked').val();
        for (i = 0; i < queueLength; i++) {
          if (config.queues[i].name == queue) {
            if (config.queues[i].name == "gpu") {
              if (config.queues[i].gpuId != gpuSpec) {
                continue;
              }
            }
            var cpuLimit = config.queues[i].coresLimit;
            var cpuCount = config.queues[i].cores;
            populateCores(cpuCount, cpuLimit);

            var memory = config.queues[i].memoryNum;
            populateMemory(memory)
            var nodeCount = config.queues[i].nodes;
            populateNodes(nodeCount);
            if (config.queues[i].name == "gpu") {
              var gpuNumber = config.queues[i].gpuNumber;
              populateGpus(gpuNumber);
              //console.log('gpuNumber', gpuNumber);
            }

          }
        }

      }

      function populateGpus(gpus) {
        //console.log('populateGpus(gpus)', gpus);
        var gpuTarget = $('#gpu');
        var gpuSpan = $('#gpuRange');
        gpuTarget.empty();
        for (j = 1; j <= gpus; j++) {
          gpuTarget.append('<option value="' + j + '">' + j + '</option>');
        }
        gpuSpan.text(" up to " + gpus);
      }

      function populateCores(cores, limit) {
        var cpu = $('#cpu');
        var cpuSpan = $('#coreRange');
        cpu.empty();
        for (j = 1; j <= cores; j++) {
          cpu.append('<option value="' + j + '">' + j + '</option>');
        }
        cpuSpan.text(" up to " + cores);
        var cpuHelp = $('#cpuHelp');
        if (limit) {
          $('#cpuHelp').text("limit of " + limit + " CPUs per node");
        }
      }

      function populateNodes(nodes) {
        var nodes = $('#nodes');
        var nodeSpan = $('#nodeRange');
        nodes.empty();
        for (j = 1; j <= nodes; j++) {
          nodes.append('<option value="' + j + '">' + j + '</option>');
        }
        nodeSpan.text(" up to " + nodes);
      }

      function populateMemory(memory) {
        var $memory = $('#memory');
        $memory.empty();
        $memory.append('<option value="' + "500M" + '">.5 (500MB)</option>');
        for (j = 1; j <= config.queues[i].memoryNum; j++) {
          $memory.append('<option value="' + j + 'G">' + j + '</option>');
        }
        $($memory).val("1G");
      }

      function populateGpuRadio(config) {
        var $gpugroup = $('#choose-gpu');
        $gpugroup.empty();
        for (i = 0; i < queueLength; i++) {
          if (config.queues[i].gpus) {
            var gpuFlagRow = $('<div class="form-check"></div>');
            var gpuFlagRadio = $('<input type="radio" class="form-check-input gpu-flag-radio" name="gpuFlag">');
            gpuFlagRadio.val(config.queues[i].gpuId);
            gpuFlagRadio.attr("data-flag", config.queues[i].gpuFlag)
            gpuFlagRadio.appendTo(gpuFlagRow);
            $('<label class="form-check-label">').html(config.queues[i].gpus).appendTo(gpuFlagRow);
          }
          $gpugroup.append(gpuFlagRow);

        }
      }
      //makes a list of gpus and finds max among all flavors for generic option and creates new entry in config.
      function populateFakeGpu(config) {
        var $gpugroup = $('#choose-gpu');
        var minNodes = 0;
        var minMem = 0;
        var minCores = 0;
        var minCoresLim = 0;
        var minGpu = 0;
        //start finding lowest number
        for (i = 0; i < queueLength; i++) {
          if (config.queues[i].gpuFlag) {
            var minNodesTest = config.queues[i].nodes;
            var minMemTest = config.queues[i].memoryNum;
            var minCoresLimTest = config.queues[i].coresLimit;
            var minCoresTest = config.queues[i].cores;
            var minGpuTest = config.queues[i].gpuNumber;
            if (minCores < minCoresTest) {
              minCores = minCoresTest;
            }
            if (minNodes < minNodesTest) {
              minNodes = minNodesTest;
            }
            if (minCoresLim < minCoresLimTest) {
              minCoresLim = minCoresLimTest;
            }
            if (minGpu < minGpuTest) {
              minGpu = minGpuTest;
            }
            if (minMem < minMemTest) {
              minMem = minMemTest;
            }
          }
        } //end loop
        config.queues.push({
          "name": "gpu",
          "gpus": "No preference",
          "gpuId": "None",
          "memoryNum": minMem,
          "nodes": minNodes,
          "gpuNumber": minGpu,
          "cores": minCores,
          "coresLimit": minCoresLim
        })
      }

      function handleGPU(queue) {
        if (queue == "gpu") {
          $('.gpu-group').show();

          if ($(".gpu-flag-radio:checked").length == 0) {
            //select the last radio, so the user doesn't see a bunch of nonsense in the script box
            $('#choose-gpu .gpu-flag-radio').last().prop("checked", true);
            populateResourceDropdowns(config);
          }

        } else { //unselect/dump gpu options
          $(".gpu-group").hide();
          $(".gpu-flag-radio").prop('checked', false);
          var $gpus = $('#gpu');
          $gpus.empty();
        }
      }

      async function copyTextToClipboard(text) {
        try {
          await navigator.clipboard.writeText(text);
          //console.log('Text copied to clipboard', text);
          notifyCopy();
        } catch (err) {
          console.error('Failed to copy: ', err);
        }
      }

      function notifyCopy() {
        //console.log('notifyCopy');
        baseWidth = $('#copyBtn').width();
        $('#copyBtn').width(baseWidth);
        copyBling();
        setTimeout(function() {
          // Your jQuery action here
          copyUnBling();
        }, 1000); // Delay in milliseconds
      }

      function copyBling() {
        //console.log('copyBling');
        $('#copyBtn').addClass('funkytown');
        $('.fancy-copy').addClass('copied');
        $('#copyBtn span').text(' Copied!');
        $('#copyBtn i').addClass('fa-beat');
        $('#copyBtn i').addClass('fa-solid fa-clipboard-check');
        $('#copyBtn i').removeClass('fa-regular fa-clipboard');
      }

      function copyUnBling() {
        //console.log('copyUnBling');
        $('#copyBtn').removeClass('funkytown');
        $('.fancy-copy').removeClass('copied');
        $('#copyBtn span').text(' Copy to Clipboard');
        $('#copyBtn i').removeClass('fa-beat');
        $('#copyBtn i').removeClass('fa-solid fa-clipboard-check');
        $('#copyBtn i').addClass('fa-regular fa-clipboard');
      }

      function generateScript() {
        // Grab Queue
        var queue = $('.queue_radio:checked').val();
        var queueStr = "#SBATCH -p " + queue + "\n";

        // Grab resources
        var cpu = getFancyDropdown('#cpu');
        var memory = getFancyDropdown('#memory');
        var nodes = getFancyDropdown('#nodes')
        var runtimeHour = getFancyDropdown('#runtimeHr');
        var runtimeMinute = getFancyDropdown('#runtimeMin');
        var runtimeFormat = runtimeHour + ":" + runtimeMinute + ":00";
        var gpu = null;
        gpu = $("#gpu").val();
        var cpuStr = "#SBATCH -n " + cpu + "\n";
        var memStr = "#SBATCH --mem=" + memory + "\n";
        var nodesStr = "#SBATCH -N " + nodes + "\n";
        var runtimeString = "# Define how long the job will run d-hh:mm:ss\n#SBATCH --time " + runtimeFormat + "\n";
        var gpuStr = "";
        if (gpu != null) {
          gpuStr = "#SBATCH --gres=gpu:" + gpu + "\n";
        }
        var gpuFlagStr = "";
        var gpuFlag = $('.gpu-flag-radio:checked').attr("data-flag");
        if (gpuFlag) {
          gpuFlagStr = gpuFlag + "\n";
        }
        // Grab modules
        var modules;
        if ($('#modules').hasClass("select2-hidden-accessible")) {
          modules = $('#modules').select2('val');
        } else {
          $('#modules').select2({
            theme: 'bootstrap4',
            width: 'resolve'
          });
          modules = $('#modules').select2('val');
        }

        var modulesStr = "";
        if (modules != null) {
          for (i = 0; i < modules.length; i++) {
            modulesStr += "module load " + modules[i].replace(/\(default\)/, "") + "\n";
          }
        }

        // Grab commands
        var commands = $('#commands').val();
        var commandsStr = commands + "\n";

        // Recommended settings
        var sunetid = $('#sunetid').val();
        var jobname = $('#jobname').val();
        var workingdir = $('#workingdir').val();
        var email = sunetid + "@stanford.edu";
        var emailStr = sunetid == "" ? "" : "# Get email notification when job finishes or fails\n#SBATCH --mail-user=" + email + "\n#SBATCH --mail-type=END,FAIL\n";
        var jobnameStr = jobname == "" ? "" : "# Give your job a name, so you can recognize it in the queue overview\n#SBATCH -J " + jobname + "\n";
        var workingdirStr = workingdir == "" ? "" : "#SBATCH -D " + workingdir + "\n";

        // Optional settings
        var stdout = $('#stdout').val();
        var stderr = $('#stderr').val();

        var stdoutStr = stdout == "" ? "" : "#SBATCH -o " + stdout + "\n";
        var stderrStr = stderr == "" ? "" : "#SBATCH -e " + stderr + "\n";

        var script = "#!/bin/bash\n" +
          "# ----------------SLURM Parameters----------------\n" +
          queueStr +
          gpuFlagStr +
          cpuStr +
          memStr +
          gpuStr +
          nodesStr +
          runtimeString +
          emailStr +
          jobnameStr +
          workingdirStr +
          stdoutStr +
          stderrStr +
          "# ----------------Load Modules--------------------\n" +
          modulesStr +
          "# ----------------Commands------------------------\n" +
          commandsStr;
        //make size of textarea auto-grow
        $('#slurm').height('auto').empty();
        $('#slurm').val(script);
        var slurmHeight = $('#slurm').height();
        var scroll = $('#slurm').prop('scrollHeight');
        if (slurmHeight != "auto") {
          if (scroll > slurmHeight) {
            $('#slurm').height(scroll + "px");
          }
        }
        //add narrative
        populateNarrative(nodes, cpu, memory, runtimeHour, runtimeMinute, gpu, queue, jobname, sunetid, stdout, stderr, workingdir);

      }

      function populateNarrative(nodes, cpu, mem, hour, min, gpu, queue, jobname, sunetid, stdout, stderr, workingdir) {
        var narrative = $('#narrative');
        narrative.empty();
        var squeueString = "";
        var emailString = "";
        var outputString = "";
        var output = "";
        var jobHelpString = "";
        if (jobname) {
          jobname = " (" + jobname + ") ";
        }
        if (sunetid) {
          var email = sunetid + "@stanford.edu";
          emailString = `<p>You will be notified at ${email} when the job ends or fails. </p>`;
          squeueString = "<code>squeue -u " + sunetid + "</code>";
          jobHelpString = `<p>After you have submitted this script, look for your job ${jobname} using the terminal command ${squeueString}</p>`
        }
        if (workingdir) {
          //need a trailing /
          workingdir += workingdir.endsWith("/") ? "" : "/"
          output = "in " + workingdir;
        }

        if (stdout) {
          stdout = workingdir + stdout
          output = stdout
        }

        if (stderr) {
          stderr = workingdir + stderr;
          if (stdout) {
            output = stdout + " and " + stderr;
          } else {
            output = stderr;
          }
        }
        if (output) {
          outputString = `<p>Your output files will be ${output}.</p>`
        }

        if (nodes) {
          nodes = isOne(nodes, "node", "nodes");
        }
        if (cpu) {
          cpu = isOne(cpu, "CPU", "CPUs");
        }
        var gpuString = "";
        if (gpu) {
          gpu = isOne(gpu, "GPU", "GPUs");
          gpuString = gpu + ",";
        }
        var partitionString = "";
        if (queue) {
          partitionString = " on the " + queue + " partition.</p> ";
        }
        var introString = "<p>This script requests "
        var nodeString = nodes + ", ";
        var cpuString = "with " + cpu + ", ";
        var memString = "and " + mem + "B of memory ";

        var timeString = "";
        var timeIntroString = "<p>This job will run up to ";
        var hourString = "";

        var minString = "";
        var hasMinutes = "";
        if (min > 00) {
          hasMinutes = true;
        }
        if (jobname) {
          var jobnameStr = "<p>This job will have the name "
        }

        if (hour) {
          if (hour != "00") {
            //remove the leading zero and handle text
            hour = hour.replaceAll(/^0+/g, "");
            hour = isOne(hour, "hour", "hours");
            if (hasMinutes) {
              hourString = timeIntroString + hour + " and "
            } else {
              hourString = timeIntroString + hour + ".</p>"
            }
          } else {
            hourString = timeIntroString;
          }
        }
        if (hasMinutes) {
          minNew = min.replaceAll(/^0+/g, "");
          minNew = isOne(minNew, "minute", "minutes");
          minString = minNew + ".</p> "
        }
        narrative.empty();
        var narrativeString = introString +
          nodeString +
          cpuString +
          gpuString +
          memString +

          partitionString +
          timeString +
          hourString +
          minString +
          outputString +
          emailString +
          jobHelpString;
        narrative.html(narrativeString);
      }

      function isOne(string, unit, unitPlural) {
        var singleString
        if (string == "1") {
          singleString = "a single " + unit;
          if (unit == "hour") {
            singleString = "an " + unit;
          }
          if (unit == "minute") {
            singleString = "1 " + unit;
          }
        } else {
          singleString = string + " " + unitPlural
        }
        return singleString;
      }

      function hasClass(elem, className) {
        return elem.classList.contains(className);
      }

      function populateTimeDropdowns() {
        //get the max runtime and subtract 1 to prevent a limit of 24 hours and a runtime of 48:59. Max hour/min will be 47:59
        var runtimeMax = config.config.runtimeLimit
        var runtimeMaxHour = config.config.runtimeLimit - 1;
        var runtimeDefault = 2;
        var display;
        var selectedString;
        var runtimeHr = $('#runtimeHr');
        runtimeHr.empty();
        for (j = 0; j <= runtimeMaxHour; j++) {
          selectedString = (j == runtimeDefault) ? " selected" : "";
          //handle single-digit numbers
          display = (j > 9) ? j : "0" + j;
          runtimeHr.append('<option value="' + display + '"' + selectedString + '>' + display + '</option>');
        }

        var runtimeMin = $('#runtimeMin');
        runtimeMin.empty();
        for (j = 0; j < 60; j++) {
          display = (j > 9) ? j : "0" + j;
          runtimeMin.append('<option value="' + display + '">' + display + '</option>');
        }
        var runMaxSpan = $('#runMax');
        runMaxSpan.text('Limit ' + runtimeMax + ' hours')

        $('.fancy-dropdown').select2({
          theme: 'bootstrap4',
          width: 'resolve'
        });
        $('.fancy-dropdown').on('select2:select', function(e) {
          generateScript();
        });
      }

      function populateModules(config) {
        var moduleSelect = $('#modules');
        var modListPath = config.config.apps_url;
        //console.log('modListPath', modListPath);
        const regex = new RegExp('^.*\/$');
        fetch(modListPath)
          .then(response => response.text())
          .then((data) => {
            $.each(data.split(/[\n\r]+/), function(index, line) {
              if (regex.test(line)) {} else {
                moduleSelect.append('<option value="' + line + '">' + line + '</option>');
              }
            });
            $('#modules').select2({
              theme: 'bootstrap4',
              width: 'resolve'
            });
            //TODO: move this
            moduleSelect.on('select2:select', function(e) {
              //var modules = $('#modules').select2('val');
              generateScript();
            });
            //TODO: move this
            var commandTextArea = $('#commands');
            $("#commands").on('input', function() {
              generateScript();
            });
            //TODO: move this
            $("#copyBtn").click(function() {
              var textToCopy = $("#slurm");
              var text = textToCopy.val();
              copyTextToClipboard(text);
            })
            $("#copyStatusBtn").click(function() {
              var textToCopy = $("#slurmStatus");
              var text = textToCopy.val();
              copyTextToClipboard(text);
            })
          })
      }
      $(document).on('input', '.autoresizing', function(e) {
        generateScript();
        //console.log('textarea', e);
        this.style.height = 'auto';
        //console.log('autoresize height', this.style.height);
        this.style.height =
          (this.scrollHeight) + 'px';
        //console.log('scroll', this.scrollHeight);
      });

      //This is to prevent an error from trying to access the value of a fancy dropdown that hasn't initialized
      function getFancyDropdown(element) {
        var value;
        if ($(element).hasClass("select2-hidden-accessible")) {
          value = $(element).select2('val');
        } else {
          value = $(element).val();
        }
        return value;
      }

      function checkSessionsStartup() {
        var sunetid = checkSession('sunetid');
        console.log('sunetid', sunetid);
        if (sunetid) {
          $('.form-control').attr("value", "GeeksForGeeks").css('background-color','pink');
          //autoFillSession('#sunetid', sunetid);
        }

      }

      function saveToSession(field, fieldValue) {
        sessionStorage.setItem(field, fieldValue);
      }

      function checkSession(field) {
        var fieldValue = sessionStorage.getItem(field);
        if (fieldValue) {
          console.log('checkSession', field);
          return fieldValue;

        }
      }

      function autoFillSession(selector, fieldValue) {

        $('#sunetid').css("border", "3px solid pink").addClass('funky');
        field = $('#sunetid');
        field.val(fieldValue);
        console.log('fuck fuck fuck', field);
      }

      document.addEventListener('change', function(e) {
        var node = e.target;
        const parent = node.closest('.slurm-form');
        if (hasClass(node, 'queue_radio')) {
          var selected_value = $(".queue_radio:checked").val();
          populateResourceDropdowns(config);
          handleGPU(selected_value);
          generateScript();
        } else if (hasClass(node, 'gpu-flag-radio')) {
          var selected_value = $(".gpu-flag-radio:checked").val();
          if (selected_value == "minGpu") {
            populateFakeGpu();
          } else {
            populateResourceDropdowns(config);
            generateScript();
          }

        } else {
          generateScript();
        }
      }, false);

    }, //end renderUI

  }; //end SlurmOMatic
  window.addEventListener("load", SlurmOMatic.init());

}(jQuery, window));